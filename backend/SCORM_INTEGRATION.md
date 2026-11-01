# SCORM integration (SCORM 1.2 and 2004)

## Supported content

The backend supports **SCORM 1.2** and **SCORM 2004 3rd/4th Edition** packages.
The package version is detected from the manifest and stored with the package.
SCORM 1.2 uses the `window.API` adapter and SCORM 2004 uses
`window.API_1484_11`. Both APIs send CMI snapshots to the LMS parent frame
using the same authenticated, ticket-bound commit endpoint.

SCORM 2004 support includes completion and success status, raw/scaled scores,
location, suspend data, learner identity, and ISO 8601 session/total time. The
existing attempt table and JSONB CMI storage are reused; no schema migration is
required. The supplied `SCORM2004_Full_Package.zip` declares SCORM 2004 4th
Edition and launches `story.html`, which redirects to `index.html`; the runtime
is injected into each HTML response so the redirected launch page receives the
API adapter too.

## Architecture

- FastAPI routes are registered from `backend/scorm_routes.py`.
- Package metadata, learner attempts, CMI data, scores, status, session time,
  launch tickets, and report data are stored in PostgreSQL.
- Extracted package files are stored under `/app/scorm_storage`, backed by the
  named Docker volume `lms_scorm_storage`.
- The course administration page provides ZIP upload, package listing,
  deletion, and a course-scoped progress report.
- The learner course page lists SCORM activities and launches the SCO in a
  sandboxed iframe. The SCORM 1.2 API bridge reports commits to the authenticated
  LMS parent frame; the package does not receive access to the LMS DOM or
  localStorage through the iframe. Content Security Policy restricts scripts and
  network requests to the LMS content origin and blocks outbound connections.
- Overall learner course progress includes SCORM activities as well as lessons.

## Upload validation

The backend enforces a 250 MiB compressed upload limit, 1 GiB expanded limit,
a 5,000-entry limit, and a maximum per-entry compression ratio of 200. It rejects
invalid ZIP files, encrypted entries, symlinks, duplicate normalized paths,
path traversal, missing root `imsmanifest.xml`, unsupported SCORM versions outside 1.2 and 2004 3rd/4th Edition,
missing SCO resources, and missing launch files. Extracted bytes are counted
while streaming to disk as an additional limit check.

## API routes

- `POST /api/scorm/courses/{course_id}/packages` — upload a SCORM ZIP
- `GET /api/scorm/courses/{course_id}/packages` — list course packages
- `DELETE /api/scorm/packages/{package_id}` — delete a package and its attempts
- `POST /api/scorm/attempts/start` — create or resume a learner attempt
- `POST /api/scorm/packages/{package_id}/launch-ticket?attempt_id={uuid}` — issue a short-lived launch cookie
- `POST /api/scorm/attempts/commit` — persist SCORM 1.2 or SCORM 2004 CMI data and status
- `GET /api/scorm/packages/{package_id}/attempts/me` — learner attempt history
- `GET /api/scorm/courses/{course_id}/reports` — role-scoped learner progress report

Package management, attempt, and report endpoints use the existing LMS
bearer-token authentication. The launch and asset endpoints use a short-lived,
package-scoped HTTP-only launch cookie issued only after an authenticated launch
request. Upload, listing, deletion, launch-ticket issuance, attempt creation,
commits, and reports are checked against the authenticated user's
company/course/department permissions.

## Deployment and verification

Do not deploy this branch directly to production until it has been built and
tested with the supplied package. Recommended verification on the test host:

```bash
git fetch origin
git switch feature/scorm-integration
git pull --ff-only origin feature/scorm-integration
docker compose config
docker compose build backend frontend
```

The commands above only update the checkout and build images; they do not restart
the running containers. Do not run `docker compose up -d backend frontend` on
the production host until the build and package checks pass and a deployment is
explicitly approved. On a separate test instance, start the test containers with
`docker compose up -d backend frontend`, then inspect `docker compose ps` and
`docker compose logs --tail=200 backend frontend`.

Then test upload, launch, resume, completion, score threshold handling, learner
progress, cross-company access denial, certificate issuance, and package
deletion. SCORM 2004 packages should be tested for launch, API discovery, resume, score,
completion/success status, and time tracking. The included 2004 sample is a small
runtime test package; compatibility with all authoring tools and every optional
SCORM CMI data-model element is not implied.
