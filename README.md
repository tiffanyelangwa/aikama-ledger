# Aikama Ledger

[Live preview](https://aikama-ledger-wm24-git-imp-38841f-tiffanyelangwa-3615s-projects.vercel.app)

Aikama Ledger is a full-stack financial operations platform being built for **Aikama Investment**, a Tanzanian business with **100+ employees operating across 3 branches**.

The system is designed to centralize accounting, payroll, approvals, reporting, and eventually inventory into one platform tailored to the company’s operating workflows.

## What it does

Aikama Ledger is built around a **double-entry PostgreSQL ledger** that serves as the financial source of truth for the application.

Current functionality includes:

* Chart of accounts and journal entry workflows
* Double-entry accounting with balanced debit/credit validation
* Approval workflows for financial entries
* Trial balance, profit and loss, and balance sheet reporting
* Employee management
* Payroll run generation
* Salary, deduction, and employer contribution calculations
* Individual payslip generation
* Payroll accounting journal construction
* Role-based access control using Supabase Auth and PostgreSQL Row-Level Security

The platform is actively being extended to support:

* Automated payroll posting
* Inventory workflows
* Additional approval flows
* Configurable Tanzania-specific payroll and financial rules

## Architecture

The application uses a full-stack architecture with financial logic split between the application layer and PostgreSQL.

### Frontend and application layer

* **Next.js**
* **TypeScript**
* React-based financial and payroll interfaces
* Server-side workflows for journal, payroll, reporting, and authentication flows

### Database and accounting layer

* **PostgreSQL**
* **Supabase**
* **PL/pgSQL**
* SQL RPCs and stored functions
* Database triggers and constraints
* Row-Level Security policies

Accounting logic is enforced as close to the database as possible so that financial integrity does not depend only on frontend validation.

For example, journal entries must satisfy double-entry accounting rules before they can be posted, while reporting functions aggregate posted ledger activity into financial statements.

## Payroll

The payroll system manages employee records and generates payroll runs for a selected period.

Each payroll run can calculate and store:

* Basic salary
* Allowances
* PAYE inputs
* Employee NSSF contributions
* Employer NSSF contributions
* SDL
* Net salary
* Payslip data

Payroll accounting logic also constructs the corresponding balanced journal entry before posting.

Some Tanzania-specific statutory rules are still being configured and validated as the system develops.

## Financial reporting

The reporting layer derives financial statements directly from posted journal activity rather than maintaining separate reporting tables.

Current reports include:

* **Trial Balance**
* **Profit and Loss**
* **Balance Sheet**

The reporting functions distinguish between period activity and cumulative balances so that income statement and balance sheet reporting follow the correct accounting behavior.

## Security

Authentication is handled through **Supabase Auth**.

Sensitive tables such as employee, payroll, payslip, and payroll configuration data are protected using **PostgreSQL Row-Level Security**.

Current payroll administration is restricted to authorized owner-level users.

## Engineering decisions

A few design principles guide the project:

### Single financial source of truth

Journal entries and journal lines form the core accounting ledger. Reports and payroll accounting ultimately connect back to this ledger instead of maintaining disconnected financial totals.

### Database-enforced integrity

Financial correctness is enforced using PostgreSQL constraints, triggers, stored functions, and validation logic rather than relying solely on application code.

### Separation of calculation and posting

Payroll can be calculated and reviewed before financial posting. Journal construction is validated for balance before finalization.

### Incremental migration from business operations

The system is being developed around the workflows of an operating business rather than as a generic accounting demo, so accounting, payroll, approvals, and future inventory workflows are being integrated gradually.

## Tech stack

| Layer          | Technologies                                   |
| -------------- | ---------------------------------------------- |
| Frontend       | Next.js, React, TypeScript                     |
| Backend        | Next.js server workflows, TypeScript           |
| Database       | PostgreSQL, Supabase                           |
| Database logic | PL/pgSQL, SQL RPCs, triggers, stored functions |
| Authentication | Supabase Auth                                  |
| Authorization  | PostgreSQL Row-Level Security                  |
| Deployment     | Vercel                                         |

## Project status

Aikama Ledger is under active development.

The accounting core, reporting workflows, employee management, payroll generation, payslips, authentication, and access-control infrastructure are implemented.

Current work focuses on completing payroll posting mappings, expanding operational workflows, and integrating inventory and additional Tanzania-specific business rules.

## Why I built it

I started Aikama Ledger to replace fragmented business processes with a system designed around the actual financial operations of my family's business in Tanzania.

The project has become an opportunity to work across full-stack engineering, relational data modeling, accounting systems, authorization, financial reporting, and business-specific software design.
