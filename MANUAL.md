# Tatun's Kambingan — System User Manual

**Version 1.0.0**

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [User Roles](#2-user-roles)
3. [Logging In](#3-logging-in)
4. [Dashboard](#4-dashboard) *(Admin only)*
5. [Pending Orders](#5-pending-orders)
6. [Completed Orders](#6-completed-orders)
7. [Payment](#7-payment)
8. [Menu Management](#8-menu-management) *(Admin only)*
9. [Manage Users](#9-manage-users) *(Admin only)*
10. [Business Rules Reference](#10-business-rules-reference)

---

## 1. System Overview

Tatun's Kambingan is a restaurant management system that handles order tracking, payment processing, menu management, and business analytics. The system runs in a web browser and updates in real time — changes made by one user are immediately visible to all other logged-in users.

**Key capabilities:**
- Track orders from placement through preparation to completion
- Process Cash and GCash payments with optional PWD/Senior discount
- Manage the product menu and add-ons
- View sales analytics and real-time order monitoring
- Administer staff accounts

---

## 2. User Roles

The system has two staff roles with different access levels:

| Feature | Admin | Staff |
|---|---|---|
| Dashboard | ✅ | ❌ |
| Pending Orders | ✅ | ✅ |
| Completed Orders | ✅ | ✅ |
| Payment | ✅ | ✅ |
| Menu Management | ✅ | ❌ |
| Manage Users | ✅ | ❌ |
| Export Reports | ✅ | ❌ |
| Order History (all-time) | ✅ | ❌ |

> **Note:** Customer accounts exist in the database but are managed separately through the customer-facing ordering interface.

---

## 3. Logging In

1. Open the system in your browser.
2. Enter your **Username** and **Password**.
3. Click **Log In**.

**After login:**
- Admins are taken to the **Dashboard**.
- Staff are taken to **Pending Orders**.

**Troubleshooting login:**
- If your account has been deactivated, you will not be able to log in. Contact an Admin.
- Passwords are case-sensitive.

---

## 4. Dashboard

*Admin only*

The Dashboard provides a real-time business overview including sales metrics, chart breakdowns, most sold items, and live order monitoring.

### 4.1 Time Period Selector

At the top of the page, select a time range for all metrics:

| Filter | Description |
|---|---|
| Daily | Shows data for a selected date vs. the previous day |
| Weekly | Shows the past 7 days vs. the 7 days before that |
| Monthly | Shows a selected month vs. the previous month |
| Yearly | Shows a selected year vs. the previous year |

Use the date/month/year picker beside the filter to select the exact period.

### 4.2 KPI Cards

Four summary cards appear at the top:

**Total Sales**
The total revenue (₱) collected within the selected period. The arrow and percentage show the change vs. the previous period.
- Green arrow up = revenue increased
- Red arrow down = revenue decreased

**Total Orders**
Number of completed paid orders in the period. Change indicator follows the same color logic.

**Average Prep Time**
Average minutes from order placement to completion. Because lower is better, the color is inverted:
- Green arrow down = prep time improved (faster)
- Red arrow up = prep time worsened (slower)

**Dine-In & Take-Out Ratio**
Percentage split between Dine-In and Take-Out orders for the period.

### 4.3 Sales Charts

**Sales Breakdown (Pie Chart)**
Shows revenue split by category: Food, Drinks, and Others. Hover over slices to see exact amounts.

**Sales Trend (Line Chart)**
Shows revenue over time as a line graph. The X-axis intervals match the selected time filter (daily points for Weekly/Daily, monthly points for Yearly, etc.).

### 4.4 Most Sold Items

A table listing the top-selling products per category within the selected period.

- Use the **category pill** buttons to filter by Meat, Fish, Vegetable, Drinks, or Others, or select ALL.
- Each row shows the product image, name, number of orders, and total revenue.
- A warning icon (⚠) appears if the product's price has changed since some of those orders were placed — this means the revenue figure reflects the price at the time of each order.

### 4.5 Real-Time Order Monitoring

**Real Time Order (card list)**
Displays the most recent active (non-completed) orders. Each card shows:
- Order ID and type (Dine-In / Take-Out)
- Total price and number of items
- Time the order was placed
- Payment badge: **PAID** (green) or **UNPAID** (red)

**Real Time Order Monitoring (counter panel)**
Shows live counts of:
- **Pending Orders** — orders currently in progress (excludes cancelled)
- **Completed Orders** — orders marked as completed

These counters refresh automatically when orders change.

---

## 5. Pending Orders

Available to all staff. This page is the main workspace for managing active orders.

### 5.1 Order List (Left Panel)

All non-completed, non-cancelled orders appear here. Each row shows:
- **Order ID** and **Queue Number** (if assigned)
- **Customer Order** badge (if placed via the customer interface)
- **Order Type**: Dine-In or Take-Out
- **Total Amount**
- **Status**: Pending or Preparing (with item count)
- **Payment badge**: PAID or UNPAID

Click any order card to open its details on the right.

### 5.2 Order Details Panel (Right Panel)

When an order is selected, the right panel shows full details:

- Order ID, Queue Number, Order Type
- Discount (if PWD/Senior 20% applied)
- **Time Order Placed** *(blue)*
- Date

**Item list** — for each item:
- Product image, name, quantity
- Add-ons attached to the item (with prices)
- Individual price
- **Serve / Unserved toggle** — tap to mark an item as served; tap again to unmark

**Order Total** — sum of all items and add-ons

**Action Buttons:**

| Button | When visible | Action |
|---|---|---|
| MARK AS PREPARING | Order is still Pending | Opens confirmation modal, then marks order as Preparing |
| ALL SERVED | Always | Confirms all items are served, moves order to Completed Orders |
| CANCEL ORDER | Always | Opens confirmation modal, cancels the order |

> **Note:** Clicking ALL SERVED will ask for confirmation before completing the order. Make sure all items are actually served before proceeding.

> **Note:** Clicking MARK AS PREPARING will also ask for confirmation before updating the status.

### 5.3 Cancelled Orders Section

At the bottom of the page, a table lists all cancelled orders. You can:
- **Search** by order ID or details
- **Paginate** through results (20 per page)
- Click a row to view its details in the right panel
- Click **RESTORE ORDER** in the details panel to move a cancelled order back to Pending

---

## 6. Completed Orders

Available to all staff. Shows recently completed orders and (for Admins) full order history with export.

### 6.1 Recent Completed Orders (Left Panel)

Displays orders completed within the **last 24 hours**. Each card shows:
- Order ID, Queue Number
- **Customer Order** badge (if applicable)
- **20% off** badge (if discount was applied)
- Total amount (discounted price if discount applied)
- Payment badge: PAID or UNPAID

Click a card to open details.

### 6.2 Order Details Panel (Right Panel)

Shows full order information for the selected recent order:

- Order ID, Queue Number, Customer Order badge
- Discount: PWD/Senior (20%) if applied
- **Time Order Placed** *(blue)*
- **Time Order Completed** *(green)*
- Date

If a discount was applied:
- **Before discount** price shown with strikethrough
- **Actual paid amount** shown below

**Item list** — product images, names, add-ons, quantities, and prices.

**Payment information** — Payment method (Cash or GCash), GCash reference number if applicable.

**Action Button:**
- **MARK AS PAID** — marks the order as paid (requires confirmation)
- **MARK AS UNPAID** — reverts payment status if needed

### 6.3 Order History Table *(Admin only)*

Below the recent orders panel, a full searchable table of all **paid** completed orders is available.

- **Search** by order ID or details
- **Paginate** (20 per page)
- Click **VIEW** on any row to open its details in a side panel

The history panel shows the same details as the recent orders panel, including Time Order Placed and Time Order Completed.

### 6.4 Export *(Admin only)*

Click the **Export** button to download order data.

**Options:**

| Option | Values |
|---|---|
| Format | CSV, Excel (.xlsx) |
| Period | Monthly, Quarterly, Yearly, Custom Date Range |

For Monthly: select the month and year.
For Quarterly: select the quarter (Q1–Q4) and year.
For Yearly: enter the year.
For Custom Range: select start and end dates.

**Exported columns:**
Order ID, Date, Time Order Placed, Time Order Completed, Total, Status, Type, Discount, Payment Method, Transaction Ref, Items

> Only **paid** orders are included in the export. Unpaid and cancelled orders are excluded.
> Cash orders show **N/A** in the Transaction Ref column.
> PWD and Senior discounts are labeled as **PWD/Senior (20%)**.

---

## 7. Payment

Available to all staff. Used to process payment for orders.

### 7.1 Finding an Order

1. Type the **Order Number** in the search box.
2. Press **Enter** or click the search button.
3. The order's items will appear in the left panel.

If the order is not found, already paid, or cancelled, a modal will inform you.

### 7.2 Order Summary (Left Panel)

Shows all items in the order:
- Product image, name, quantity
- Add-ons listed below each item

**Toggle Buttons (top of panel):**
- **Cashless** — switches payment mode to GCash
- **PWD/Senior** — toggles the 20% discount on/off

If the customer already applied a PWD/Senior discount when ordering, it will be pre-applied and a warning will appear: *⚠ You applied PWD/Senior discount (20%).*

### 7.3 Payment Summary (Right Panel)

| Field | Description |
|---|---|
| Subtotal | Line-by-line itemized total |
| Discount (PWD) | 20% of subtotal if discount applied, otherwise ₱0.00 |
| Total | Subtotal minus discount |
| Amount Received | Cash mode only — enter the amount given by the customer |
| Change | Amount Received minus Total (green = change due; red = still owed) |

**Amount Received input:**
- Automatically formats with thousands separator (e.g., 1,500)
- Maximum allowed value: ₱20,000
- Must be greater than or equal to the Total for Cash payments

### 7.4 Payment Methods

**Cash:**
1. Enter the Amount Received.
2. Confirm the change shown.
3. Click **Complete Payment**.

**GCash (Cashless):**
1. Click the **Cashless** toggle.
2. A modal appears — enter the 13-digit GCash transaction reference number.
3. Click Confirm.
4. The total is auto-filled as the amount received.
5. Click **Complete Payment**.

**Zero-Total Orders:**
If the total is ₱0.00 (fully discounted or free), the payment can be completed without entering any amount.

### 7.5 Completing Payment

Click **Complete Payment** to finalize. A success modal confirms the payment method used.

After payment:
- The order's status updates to **PAID** instantly across all pages.
- The order will appear as PAID in Pending Orders and Completed Orders immediately.

Click **Cancel** to clear the current order and start over.

---

## 8. Menu Management

*Admin only*

Used to manage the product catalog — adding, editing, and toggling product availability.

### 8.1 Browse Products

Products are grouped by category: **Meat, Fish, Vegetable, Drinks, Others, Add-ons**.

Use the **search box** to find products by name.
Use the **category filter** buttons to show only one category.

Each product row shows:
- Product image and name
- Availability status (AVAILABLE / UNAVAILABLE)
- Current price
- Edit button

### 8.2 Changing Availability Status

Click the **status dropdown** on any product or add-on row.

A confirmation modal will appear: *"You are about to change the status to [STATUS]. Are you sure?"*

- Click **Yes, change** to confirm.
- Click **Cancel** to revert.

The change is reflected immediately and saved to the database.

### 8.3 Price History Tooltip

If a product's price has been changed in the past, hovering over the price cell shows a tooltip with:
- **Previous price**
- **Current price**

Price history is stored using Slowly Changing Dimension (SCD) Type 2 — each price change creates a new record in the database while preserving the old one for historical reference.

### 8.4 Adding a New Product

1. Click **+ Add Product** (top right).
2. Fill in the form:

| Field | Required | Notes |
|---|---|---|
| Name | Yes | Max 200 characters; must be unique (case-insensitive) |
| Price | Yes | Must be a non-negative number |
| Status | Yes | AVAILABLE or UNAVAILABLE |
| Type | Yes | Meat, Fish, Vegetable, Drinks, Others |
| Description | No | Optional text shown to customers |
| Image | No | JPG, PNG, or GIF; max 5 MB |

3. A confirmation modal summarizes the details.
4. Click **Yes** to save.

### 8.5 Editing a Product

1. Click **EDIT** on any product row.
2. Modify any fields (name, price, status, type, description, or image).
3. A confirmation modal shows a summary of what changed.
4. Click **Yes** to save.

> **Price Change Rule:** If you change the price, the system automatically archives the old record (marks it as historical) and creates a new current record with the updated price — preserving full price history.

### 8.6 Managing Add-ons

Add-ons appear as a separate category at the bottom of the product list.

- **Inline status dropdown** — change availability directly from the list (requires confirmation)
- **EDIT button** — opens a modal to change the add-on's price and availability
  - The add-on name is read-only (cannot be changed)

---

## 9. Manage Users

*Admin only*

Used to create and manage staff and admin accounts.

### 9.1 User Overview Cards

At the top, two stat cards show:
- **Active Staff** — count of currently active staff accounts (hover to see names)
- **Active Admin** — count of currently active admin accounts (hover to see names)

### 9.2 User List

All accounts appear in a table sorted by role (Admins first, then Staff, then Customers), then alphabetically.

Each row shows:
- Avatar (initials from name)
- Name and **Disabled** badge (if account is deactivated)
- Role pill (Admin / Staff / Customer)
- Edit button

**Search & Filter:**
- Type in the search box to filter by name or role.
- Use the role filter dropdown to show only one role type.

### 9.3 Adding a New User

1. Click **+ Add User**.
2. Fill in the form:

| Field | Required | Notes |
|---|---|---|
| Name | Yes | Max 100 characters; must be unique (case-insensitive) |
| Password | Yes | 6–128 characters |
| Role | Yes | Admin or Staff |

3. A confirmation modal appears.
4. Click **Yes** to create the account.

The new user can log in immediately with the credentials you set.

### 9.4 Editing a User

1. Click **EDIT** on any user row.
2. Available fields:

| Field | Notes |
|---|---|
| Name | Required, max 100 characters |
| New Password | Optional — leave blank to keep the existing password |
| Role | Admin or Staff |
| Account Status | Active or Inactive — cannot change your own status |

3. A confirmation modal summarizes the changes.
4. Click **Yes** to save.

**Remove Account:**
- The **Remove Account** button is available for any user except yourself and the last remaining admin.
- Removing an account is permanent.

### 9.5 Admin Safety Rules

The system prevents the following actions:
- An admin cannot **demote themselves** from Admin role.
- An admin cannot **deactivate their own account**.
- An admin cannot **delete themselves**.
- The **last remaining Admin** account cannot be deleted — at least one admin must always exist.

---

## 10. Business Rules Reference

### Order Statuses

| Status | Meaning |
|---|---|
| Pending | Order placed, not yet being prepared |
| Preparing | Kitchen has been notified and is working on the order |
| Completed | All items served, order closed |
| Cancelled | Order was cancelled; visible in the Cancelled Orders section |

### Payment Statuses

| Status | Meaning |
|---|---|
| Paid | Payment has been recorded via the Payment page |
| Unpaid | No payment recorded yet |

### Discount

- Only one discount type is available: **PWD/Senior — 20% off the subtotal**
- Can be applied by the customer when ordering, or by staff during payment
- Cannot be partially applied — it is always 20%

### Payment Methods

| Method | Requirement |
|---|---|
| Cash | Amount received must be ≥ total |
| GCash | 13-digit transaction reference number required |

### Price History (SCD Type 2)

When a product price is updated, the old price record is archived (not deleted). This means:
- All past orders retain the correct price at the time they were placed
- The Dashboard shows a warning (⚠) when a product's current price differs from what was charged on past orders in the selected period
- The Menu page shows a tooltip comparing old and new prices

### Real-Time Synchronization

All pages update automatically when data changes:
- A new order appears in Pending Orders within seconds of being placed
- Marking an order as paid instantly updates its badge across all open browser tabs
- The Dashboard counters update live as orders move through statuses

### Currency

All amounts are in **Philippine Peso (₱)**, displayed with 2 decimal places (e.g., ₱ 1,234.50).

---

*For technical support or bug reports, contact your system administrator.*
