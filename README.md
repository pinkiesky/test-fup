# Test

## First run

Check `.env` file and set the correct values.

Make sure your MongoDB is running in replica set mode.

```bash
$ npm install && npm run build && npm run db:init
```

## Run app

```bash
$ npm run app:start
```

## Run incremental sync

```bash
$ npm run sync:incr
```

## Run full sync

```bash
$ npm run sync:full
```