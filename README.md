# copupbid_auction

## Admin Upload Cleanup

Preview unused upload images:

```text
GET https://api.copup.copupbid.com/api/admin/uploads/unused
```

Delete unused upload images:

```text
DELETE https://api.copup.copupbid.com/api/admin/uploads/unused
```

No request body is needed in Postman.

The cleanup checks database image references first, then deletes only image files in `backend/uploads` that are not referenced by the site SQL data.

## Admin Permissions

Run this migration before deploying the sub-admin permission feature:

```text
backend/migration/20260727_admin_permissions.sql
```

Existing `admin` users become `super` admins. Super admins can open:

```text
/admin/users
```

From Users Management, edit a user, set role to `admin`, choose `limited`, then select the allowed management modules such as `Product Management`.

Limited admins are redirected after login to:

```text
/admin/management
```

They only see and access assigned management modules.
