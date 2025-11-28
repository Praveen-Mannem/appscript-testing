# Google Workspace Inactive User Audit

This Google Apps Script identifies users in your Google Workspace domain who:
1.  Are assigned the **Enterprise Plus** license (or any configured SKU).
2.  Have been **inactive** (no login) for the last **365 days**.

The results are exported to a Google Sheet.

## Prerequisites

-   **Google Workspace Administrator** access.
-   Access to [script.google.com](https://script.google.com).

## Setup Instructions

1.  **Create the Script**:
    *   Go to [script.google.com](https://script.google.com) and click **New Project**.
    *   Copy the contents of `UserAudit.js` into the `Code.gs` file.
    *   Rename the project to "Inactive User Audit".

2.  **Enable Advanced Services**:
    *   In the left sidebar, click on **Services** (+).
    *   Find and select **Admin SDK API**.
    *   Click **Add**.
    *   *Note: This enables both `AdminDirectory` and `AdminLicenseManager`.*

3.  **Configure the Script**:
    *   Open the script file.
    *   Locate the `CONFIG` object at the top.
    *   **Verify the `TARGET_SKU_ID`**:
        *   The script includes a `SKU_CATALOG` object with common SKU IDs.
        *   The default is set to **Enterprise Plus** (`1010020020`).
        *   If you need a different license, copy the ID from the `SKU_CATALOG` in the script or check the [Google Workspace Admin SDK documentation](https://developers.google.com/workspace/admin/licensing/v1/how-tos/products).

4.  **Run the Audit**:
    *   Select the `auditInactiveEnterpriseUsers` function from the toolbar.
    *   Click **Run**.
    *   Grant the necessary permissions when prompted.

5.  **View Results**:
    *   Open the **Execution Log** to see progress.
    *   Once complete, the log will provide a URL to the generated Google Sheet containing the list of users.

## Troubleshooting

-   **"AdminDirectory is not defined"**: Ensure you added the **Admin SDK API** service in Step 2.
-   **No users found**:
    -   Check if the `TARGET_SKU_ID` is correct.
    -   Verify if there are actually users who haven't logged in for 365 days.
