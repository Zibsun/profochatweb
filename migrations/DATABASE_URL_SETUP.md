# DATABASE_URL Setup Guide

This guide explains how to configure `DATABASE_URL` for the migration tools.

## Overview

All migration tools (`migrate.sh`, `status.sh`, `rollback.sh`, `seed.sh`, `init_history.sh`) require `DATABASE_URL` to connect to your PostgreSQL database.

## Format

`DATABASE_URL` follows the PostgreSQL connection string format:

```
postgresql://[user]:[password]@[host]:[port]/[database]
```

### Examples

**Local development:**
```bash
DATABASE_URL=postgresql://postgres:mypassword@localhost:5432/profochatweb
```

**With default port (5432):**
```bash
DATABASE_URL=postgresql://postgres:mypassword@localhost/profochatweb
```

**Remote server:**
```bash
DATABASE_URL=postgresql://myuser:mypass@db.example.com:5432/mydb
```

**With special characters in password:**
If your password contains special characters (like `@`, `:`, `/`), URL-encode them:
- `@` becomes `%40`
- `:` becomes `%3A`
- `/` becomes `%2F`
- `%` becomes `%25`

Example:
```bash
# Password: p@ss:w/rd
DATABASE_URL=postgresql://user:p%40ss%3Aw%2Frd@localhost:5432/mydb
```

## Setting DATABASE_URL

The migration tools will look for `DATABASE_URL` in the following order:

1. **Environment variable** (highest priority)
2. **`.env` file in project root** (`$PROJECT_ROOT/.env`)
3. **`.env` file in backend directory** (`$PROJECT_ROOT/webapp/backend/.env`)

### Method 1: Environment Variable

Set it in your current shell session:

```bash
export DATABASE_URL='postgresql://user:password@host:port/database'
```

To make it persistent, add it to your shell configuration file (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
echo 'export DATABASE_URL="postgresql://user:password@host:port/database"' >> ~/.zshrc
source ~/.zshrc
```

### Method 2: .env File in Project Root

Create or edit `.env` in the project root:

```bash
# /Users/askhaturazbaev/projects/profochatweb/.env
DATABASE_URL=postgresql://postgres:mypassword@localhost:5432/profochatweb
```

**Note:** Make sure `.env` is in your `.gitignore` to avoid committing sensitive credentials.

### Method 3: .env File in Backend Directory

Create or edit `.env` in the backend directory:

```bash
# /Users/askhaturazbaev/projects/profochatweb/webapp/backend/.env
DATABASE_URL=postgresql://postgres:mypassword@localhost:5432/profochatweb
```

## Verification

To verify that `DATABASE_URL` is set correctly, you can:

1. **Check environment variable:**
   ```bash
   echo $DATABASE_URL
   ```

2. **Use the check script:**
   ```bash
   ./migrations/tools/check_env.sh
   ```

3. **Test connection:**
   ```bash
   # Parse and test connection
   psql "$DATABASE_URL" -c "SELECT version();"
   ```

## Troubleshooting

### Error: "DATABASE_URL is not set"

**Solution:** Ensure `DATABASE_URL` is set in one of the locations mentioned above.

1. Check if `.env` files exist:
   ```bash
   ls -la .env webapp/backend/.env
   ```

2. Check if `DATABASE_URL` is in the environment:
   ```bash
   echo $DATABASE_URL
   ```

3. If using `.env` files, verify the format:
   ```bash
   grep DATABASE_URL .env webapp/backend/.env
   ```

### Error: "Invalid DATABASE_URL format"

**Solution:** Check that your `DATABASE_URL` follows the correct format:
- Must start with `postgresql://`
- Format: `postgresql://user:password@host:port/database`
- Port is optional (defaults to 5432)

### Error: Connection refused / Could not connect

**Possible causes:**
1. Database server is not running
2. Incorrect host or port
3. Firewall blocking connection
4. Database name doesn't exist

**Solutions:**
1. Verify PostgreSQL is running:
   ```bash
   # macOS
   brew services list | grep postgresql
   
   # Linux
   sudo systemctl status postgresql
   ```

2. Test connection manually:
   ```bash
   psql -h localhost -p 5432 -U postgres -d profochatweb
   ```

3. Check if database exists:
   ```bash
   psql -h localhost -U postgres -l
   ```

### Error: Authentication failed

**Possible causes:**
1. Incorrect username or password
2. User doesn't have permission to access the database

**Solutions:**
1. Verify credentials:
   ```bash
   psql -h localhost -U your_username -d your_database
   ```

2. Check user permissions:
   ```sql
   -- Connect as superuser
   psql -U postgres
   
   -- Grant permissions
   GRANT ALL PRIVILEGES ON DATABASE your_database TO your_username;
   ```

## Best Practices

1. **Never commit `.env` files** - Add them to `.gitignore`
2. **Use different databases for different environments** (dev, staging, prod)
3. **Use environment-specific `.env` files** (`.env.development`, `.env.production`)
4. **Rotate credentials regularly** for production databases
5. **Use connection pooling** for production applications
6. **Store production credentials securely** (use secrets management tools)

## Related Files

- `migrations/tools/check_env.sh` - Script to diagnose DATABASE_URL issues
- `migrations/tools/migrate.sh` - Main migration runner
- `migrations/tools/status.sh` - Check migration status
- `migrations/tools/rollback.sh` - Rollback migrations
- `migrations/tools/seed.sh` - Apply seed data
- `migrations/tools/init_history.sh` - Initialize migration history table

## Additional Resources

- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
