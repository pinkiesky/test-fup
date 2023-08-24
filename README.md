# Test

## First run

Required Node version: v14 or higher (tested on v14.21.3).

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

## Drop (recreate) database

In case you want to drop the database and start from scratch.

```bash
$ npm run db:recreate
```
