# RoadAid Database Design

**Version:** 1.0

**Status:** Draft

---

# Database Overview

The RoadAid database is designed using a relational model. It stores user accounts, service providers, customer information, service requests, quotations, payments, reviews, complaints, notifications, and system logs.

The database follows normalization principles to minimize redundancy and maintain data integrity.

---

# Database Entities

1. users
2. customer_profiles
3. service_providers
4. workshops
5. provider_services
6. provider_specializations
7. vehicles
8. service_requests
9. quotations
10. payments
11. reviews
12. complaints
13. notifications
14. favorites
15. system_logs
16. request_status_history

---

# Notes

- One users table is used for authentication.
- Customers, Service Providers, and Admins are differentiated using the `role` field.
- A service provider may offer one or more services.
- Workshop information is stored separately.
- One quotation is generated for each service request.
- Fuel Assistance only locates nearby fuel stations; fuel delivery is not included in Version 1.
