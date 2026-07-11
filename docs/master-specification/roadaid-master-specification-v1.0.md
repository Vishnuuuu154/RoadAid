# RoadAid Master Specification (RMS)

**Version:** 1.0

**Status:** Draft

**Last Updated:** July 2026

---

# 1. Project Information

## Project Name

RoadAid

## Project Type

Responsive Web Application

## Category

A Responsive Web Application for Smart Roadside Assistance

## Technology Stack

### Frontend
- HTML
- CSS
- JavaScript
- Bootstrap

### Backend
- Java Spring Boot

### Database
- MySQL

### Version Control
- Git & GitHub

### IDE
- IntelliJ IDEA

---

# 2. Vision

To provide a reliable, intelligent, and user-friendly roadside assistance platform that connects customers with verified service providers quickly, safely, and transparently.

---

# 3. Mission

- Reduce roadside waiting time.
- Connect customers with verified service providers.
- Provide transparent pricing.
- Improve customer convenience through GPS-based assistance.
- Build a trusted digital roadside assistance platform.

---

# 4. Project Scope

RoadAid provides the following services:

- Roadside Mechanic Assistance
- Towing Assistance
- Workshop Appointments
- Fuel Assistance (Fuel Station Locator)

The platform allows customers to request roadside help, schedule workshop appointments, track service providers, make secure payments, and submit ratings and complaints after service completion.

---

# 5. User Roles

## Customer

- Request roadside assistance
- Book workshop appointments
- Track service providers
- Make payments
- Submit reviews and complaints

---

## Service Provider

A service provider can offer one or more of the following:

- Roadside Mechanic
- Workshop
- Towing

Service providers can:

- Accept or reject requests
- Generate quotations
- Manage appointments
- Receive payments
- Update availability

---

## Administrator

The administrator is responsible for:

- Verifying service providers
- Managing complaints
- Monitoring requests
- Viewing analytics
- Managing platform operations

---

# 6. Business Rules

The following business rules define how the RoadAid platform operates.

## BR-1 User Roles

RoadAid consists of three user roles:

- Customer
- Service Provider
- Administrator

---

## BR-2 Service Provider Verification

Every service provider must be verified by the administrator before becoming active.

Unverified providers cannot receive service requests.

---

## BR-3 Provider Services

A service provider may offer one or more of the following services:

- Roadside Mechanic
- Workshop
- Towing

---

## BR-4 Vehicle Support

RoadAid supports:

- Two-Wheelers
- Three-Wheelers
- Cars
- SUVs
- Vans
- Heavy Vehicles

---

## BR-5 Service Matching

Customers are matched only with service providers capable of handling the selected vehicle type and requested service.

---

## BR-6 Provider Availability

A service provider can manually set their status as:

- Online
- Offline

When a request is accepted, the system automatically changes the status to:

- Busy

---

## BR-7 GPS-Based Service Requests

Roadside assistance requests always use the customer's current GPS location.

No permanent customer address is required.

---

## BR-8 Favorites

Customers can mark service providers as favorites.

Favorite providers always appear at the top of the search results when they are online.

The remaining providers are sorted by distance by default.

Customers may remove a favorite at any time.

---

## BR-9 Workshop Appointments

Customers may schedule workshop appointments.

Service providers may:

- Accept
- Reject
- Suggest another available time slot

---

## BR-10 Fuel Assistance

RoadAid provides information about nearby fuel stations.

Fuel delivery is n  ot supported in Version 1.