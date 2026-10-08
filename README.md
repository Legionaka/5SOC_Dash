# Medi-Clinic Dashboard

This project uses Auth.js credentials authentication with roles stored on each
`users` record. The database seed endpoint creates or migrates the `users.role`
column; existing users receive the `patient` role unless assigned a different
role explicitly.

## Role-protected routes

| Role | Dashboard entry |
| --- | --- |
| `admin` | `/dashboard`, including invoices and customers |
| `doctor` | `/dashboard/doctor` |
| `patient` | `/dashboard/user` |
| `pharmacy_reception` | `/dashboard/pharmacy/reception` |
| `pharmacy_stocker` | `/dashboard/pharmacy/stock` |
| `pharmacist` | `/dashboard/pharmacy/pharmacist` |

The patient test route is restricted to the exact `user@nextmail.com` account
and the `patient` role. Unauthorized dashboard access redirects to
`/unauthorized`. Role changes take effect after the account signs in again.

For more information, see the [course curriculum](https://nextjs.org/learn) on the Next.js Website.
