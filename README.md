\# RoadAid — Smart Roadside Assistance



RoadAid is a full-stack web application designed to connect customers who need roadside assistance with mechanics who can provide vehicle repair and support services.



The platform manages service requests, quotations, payments, notifications, and administrative operations through a centralized application.



\## Features



\### Customer

\- User authentication

\- Create and manage roadside assistance requests

\- View mechanic responses and quotations

\- Manage service payments

\- Submit complaints and view notifications



\### Mechanic

\- Manage service requests

\- Respond to customer requests with quotations

\- Manage payment-related activities

\- Receive notifications and handle customer complaints



\### Administrator

\- Manage platform operations

\- Review and manage mechanic accounts

\- Oversee service requests and complaints



\## Technology Stack



\*\*Frontend\*\*

\- React

\- Vite

\- JavaScript

\- Axios

\- CSS

&#x20;

\*\*Backend\*\*

\- Java

\- Spring Boot

\- Spring Data JPA / Hibernate

\- REST APIs

\- Maven



\*\*Database\*\*

\- MySQL



\*\*Other Technologies\*\*

\- Razorpay payment integration

\- Git and GitHub



\## Project Structure



```text

RoadAid/

├── backend/

├── frontend/

└── README.md

```



\## Prerequisites



Install the following before running the application:



\- Java JDK

\- Maven

\- Node.js and npm

\- MySQL



\## Setup and Installation



\### 1. Clone the Repository



```bash

git clone <YOUR\_GITHUB\_REPOSITORY\_URL>

cd RoadAid

```



\### 2. Configure the Database



1\. Start MySQL.

2\. Create the database required by the backend.

3\. Configure the database URL, username, and password in the backend configuration.



Check the backend's existing configuration for the exact database name.



\### 3. Configure Environment Variables



Set the required environment variables for database credentials and any configured JWT, email, or payment integration settings.



\*\*Security:\*\* Never commit passwords, API secrets, JWT secrets, or other private credentials to GitHub. Keep them in local environment variables or an appropriately ignored environment file.



\### 4. Run the Backend



Open a terminal in the backend directory:



```bash

cd backend

mvn spring-boot:run

```



The backend is expected to run at:



`http://localhost:8080`



\### 5. Run the Frontend



Open another terminal in the frontend directory:



```bash

cd frontend

npm install

npm run dev

```



Open the local URL printed by Vite in your terminal. The default development URL is commonly:



`http://localhost:5173`



\## Development Status



RoadAid is a full-stack project developed to demonstrate roadside assistance workflows, role-based functionality, service request management, and payment-related operations.



Some integrations may require additional environment configuration before they can be used.



\## Future Improvements



\- Improve automated testing and error handling

\- Enhance deployment and production configuration

\- Expand monitoring and reporting features

\- Improve application security and documentation

\- Adding Towing as a provider



\## Author



Developed as a full-stack application project.