# Integrations

This doc covers the cross-provider rules and the Jira → Tempo timesheets
bridge. Per-provider implementation details live next to the code in
`src/main/integrations/providers/<id>.ts`.

## Universal rules

### Assignee-scoped fetches

Every provider fetches **only tasks where the authenticated user is the
assignee**. We use the source's native filter:

| Provider | Native filter                           |
| -------- | --------------------------------------- |
| Linear   | `assignee: { isMe: true }` (GraphQL)    |
| Jira     | `assignee = currentUser()` (JQL)        |
| GitHub   | `assignee:@me` (REST/GraphQL search)    |
| Asana    | `assignee=me` query parameter           |
| Notion   | `filter` on the people-property = "@me" |
| GCal     | calendar events you organize / attend   |

The `IntegrationConfig.assigneeOnly` flag (default `true`) gates this
behaviour. The companion flag `includeUnassignedICreated` (default
`false`) widens the query to include tasks the user _created_ even when
the assignee field is empty — useful for solo workflows.

Both flags live in `Settings.integrationConfigs[<provider>]` and surface
in Settings → Integrations → expand a provider tile.

### Caching + polite networking

`src/main/integrations/cache.ts` — SQLite-backed response cache, keyed
by `(provider, resource)`. Stores ETag + `updated_at` + raw payload.

`src/main/integrations/httpClient.ts` — request layer:

- **Conditional GET** with `If-None-Match` when an ETag is cached. 304s
  are free against per-user quotas.
- **Coalescing**: identical in-flight requests dedupe to one network
  call within a 2-second window.
- **Rate-limit awareness**: reads `X-RateLimit-Remaining` /
  `Retry-After` and backs off; renderer surfaces a small status pill if
  a provider is throttled.
- **Polling cadence**:
  - Background refresh: every 15 min while the app is open.
  - Window focus: refresh only if cache is older than 5 min.
  - Manual "Refresh" button: bypass both floors.

### Offline-first reads

The renderer always reads from SQLite (the cache), never directly from
the network. Network calls update the cache, the cache updates the UI.
The user never sees a spinner blocking content if data exists locally.

## Jira → Tempo bridge

When the user connects Jira, on first connect we probe the Tempo REST
endpoint (`/rest/tempo-timesheets/4/worklogs` for Server / DC, or the
Tempo Cloud equivalent). If reachable, a "Tempo detected — sync time
entries?" toggle surfaces in Settings → Integrations → Jira (default
off).

### Mapping

Each local `entry` whose task has a Jira ticket key syncs as a Tempo
worklog:

| Tempo field        | Local source                                     |
| ------------------ | ------------------------------------------------ |
| `issueKey`         | `task.ticket`                                    |
| `timeSpentSeconds` | `(entry.endedAt - entry.startedAt) / 1000`       |
| `startDate`        | `YYYY-MM-DD` of `entry.startedAt`                |
| `startTime`        | `HH:MM:SS` of `entry.startedAt`                  |
| `description`      | `task.title`; `entry.note` appended when present |

### Direction + idempotency

- **Local → Tempo only.** We never pull worklogs back as local entries.
- **Idempotent.** The remote `worklogId` is stored in `entry_sync` keyed
  by local `entry.id`, so re-syncing updates rather than duplicates.
- **Conflict detection.** If a worklog has `updatedAt` newer than our
  last sync, we don't clobber it. The conflict surfaces as a non-blocking
  nudge ("1 worklog has remote changes. Resolve in Settings → Sync.")
  with per-entry "local wins" / "remote wins" controls.

### Scheduler

- Debounced **every 5 min** while the app is open.
- **On app close**, a final flush.
- Manual **"Sync now"** button in Settings → Integrations → Jira.
- **Batched writes**: accumulate up to 30 seconds OR 20 entries,
  whichever comes first.

### Errors

If sync fails (auth, network, validation), we show a small error badge
on the Jira tile in Settings and write the details to `audit.log`. The
UI itself is never blocked.

### Dry-run

Set `tempoConfig.dryRun = true` (dev-only setting) to log every
candidate sync without hitting the API. Useful for validating mappings
against a test workspace.

## Adding a new provider

1. **Add an entry to `INTEGRATION_META`** in
   `src/shared/integrations/registry.ts`. Pick a brand color, label,
   single-glyph letter, and URL template (with `{ticket}` /
   `{workspace}` / `{id}` tokens as appropriate).
2. **Drop a class into `src/main/integrations/providers/<id>.ts`**
   extending `BaseProvider`. Implement `validate(input)` and
   `fetchTasks()`. The latter MUST honour `assigneeOnly` and
   `includeUnassignedICreated` from the per-provider config.
3. **Wire keychain storage** automatically — `BaseProvider` handles the
   `keytar` round-trip.
4. **Test** that the rate-limit / conditional-request behaviour kicks
   in by reading the debug panel after a few minutes of idle.
