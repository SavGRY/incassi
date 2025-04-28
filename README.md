# Quick setup guide

## Backend
### Docker
- `ln -s devel.yaml docker-compose.ovedrride.yaml`
- `ln -s commpon.yaml docker-compose.yaml`

in the `.docker/` folder rename all the `*.example`.
In `auth_opt.env`:
- Put the required algorithm (HS256 is the preferred)
- Put the time for the access token to expire
- Generate a new FastAPI secret key:
    In bash run this command (you need to have openssl) (more action you are actually doing the better)
    [Here is the snippet](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/#hash-and-verify-the-passwords)
    - `openssl rand -hex 32`
---
In `pg_conf.env`:
- Put the admin name
- put the admin passwd
- put the preferred db name
- compose the postresql connection string like
    **the db-host-name** should be the name of the docker service
    - `postgresql://<name>:<passwd>@<db-host-name>/<db-name>`

### FastAPI
in the core folder of the FastAPI project find the `alembic.ini.example` and remove the `.example`.
To find more check [alembic guide](https://alembic.sqlalchemy.org/en/latest/tutorial.html#editing-the-ini-file)


---
## FrontEnd
For the frontend is advisable to install the `node_modules` locally even tho there's the docker container.

---
## Finally
For the last bit of setup just run
- `docker compose build`
- `docker compose up -d`

This project has renovate implamentation

All rights reserved
