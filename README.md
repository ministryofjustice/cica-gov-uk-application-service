# Application Service

## Getting started

1. Down repo
2. run `npm install`
3. run `npm run start:dev`
4. View api docs at: `http://localhost:3800/docs/`

### Notes

* Listening port can be found in `bin/www` currently `3800`
* There is a secret and a JWT in `foo/foo-routes.js` for demo purposes. The JWT can be used in the OpenAPI (swagger) docs to try out the endpoints. These SHOULD NOT live in the codedase.
* Start API with `npm run start:dev`. This will watch for file changes and reload the api. Also allows for a debugger to be attached. Standard `npm run start` is also available.
* Once running, view docs and try `foo` endpoints at `http://localhost:3800/docs/`
* Any `process.env` vars will need to be handled correctly e.g. as part a Docker compose file.
* OpenAPI src files can be found in `openapi/src`. This will auto build on `npm install`, running tests, and modifying the openapi src files. Once built, the doc is written to `openapi/openapi.json`
