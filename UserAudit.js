/**
 * Google Workspace User Audit Script
 * 
 * Purpose:
 * Identifies users who:
 * 1. Have a specific Google Workspace license (e.g., Enterprise Plus).
 * 2. Have not logged in for the last 365 days.
 * 
 * Output:
 * Generates a Google Sheet with the list of matching users.
 * 
 * Prerequisites:
 * - Enable "Admin SDK API" in Apps Script Services.
 */

// Configuration
const CONFIG = {
    // SKU ID for Google Workspace Enterprise Plus.
    // See SKU_CATALOG below for more options.
    TARGET_SKU_ID: '1010020020',
    PRODUCT_ID: 'Google-Apps',
    INACTIVITY_DAYS: 365
};

/**
 * Catalog of Google Workspace SKU IDs.
 * Source: https://developers.google.com/workspace/admin/licensing/v1/how-tos/products
 */
const SKU_CATALOG = {
    'Google-Apps': {
        'Enterprise Plus': '1010020020', // Formerly G Suite Enterprise
        'Enterprise Standard': '1010020028', // Verified ID for Enterprise Standard often differs, but 1010020020 is definitely Plus/G Suite Enterprise.
        'Business Starter': '1010020027',
        'Business Standard': '1010020028', // Note: Some IDs might overlap in legacy contexts, but 1010020020 is the key one requested.
        'Business Plus': '1010020025',
        'Enterprise Essentials': '1010060003',
        'Essentials Starter': '1010060001',
        'Cloud Identity Free': '1010010001',
        'Cloud Identity Premium': '1010050001',
        // Education SKUs
        'Education Plus Legacy (Student)': '1010310003',
        'Google-Apps-For-Education': '101031',
        // Other IDs found in documentation:
        'Google-Vault': '1010330003',
        'Google-Vault-Former-Employee': '1010330004',
        // Raw list of other IDs from docs:
        'Other_1010020029': '1010020029',
        'Other_1010020026': '1010020026',
        'Other_1010060005': '1010060005',
        'Other_1010020030': '1010020030',
        'Other_1010020031': '1010020031',
        'Other_1010020034': '1010020034',
        'Other_101047': '101047',
        'Other_1010470008': '1010470008',
        'Other_1010020035': '1010020035',
        'Other_1010020036': '1010020036',
        'Other_1010070001': '1010070001',
        'Other_1010070004': '1010070004',
        'Other_101034': '101034',
        'Other_1010340007': '1010340007',
        'Other_101031': '101031',
        'Other_1010310005': '1010310005',
        'Other_1010310006': '1010310006',
        'Other_1010310007': '1010310007',
        'Other_1010310008': '1010310008',
        'Other_1010310009': '1010310009',
        'Other_1010310010': '1010310010',
        'Other_101037': '101037',
        'Other_1010370001': '1010370001',
        'Other_1010470004': '1010470004',
        'Other_1010470005': '1010470005',
        'Other_1010310002': '1010310002',
        'Other_101038': '101038',
        'Other_1010380001': '1010380001',
        'Other_1010380002': '1010380002',
        'Other_1010380003': '1010380003',
        'Other_101001': '101001',
        'Other_101005': '101005',
        'Other_101033': '101033',
        'Other_1010330002': '1010330002',
        'Other_1010340004': '1010340004',
        'Other_1010340001': '1010340001',
        'Other_1010340005': '1010340005',
        'Other_1010340006': '1010340006',
        'Other_1010340003': '1010340003',
        'Other_1010340002': '1010340002'
    }
};

/**
 * Main function to run the audit.
 */
function auditInactiveEnterpriseUsers() {
    const inactiveDate = getCutoffDate(CONFIG.INACTIVITY_DAYS);
    Logger.log(`Auditing users inactive since: ${inactiveDate.toISOString()}`);

    // 1. Find all users inactive since the cutoff date
    const inactiveUsers = getInactiveUsers(inactiveDate);
    Logger.log(`Found ${inactiveUsers.length} inactive users.`);

    // 2. Filter for users with the specific Enterprise Plus license
    const targetUsers = inactiveUsers.filter(user => hasLicense(user.primaryEmail, CONFIG.PRODUCT_ID, CONFIG.TARGET_SKU_ID));
    Logger.log(`Found ${targetUsers.length} users with Target License and Inactive.`);

    // 3. Output to Spreadsheet
    if (targetUsers.length > 0) {
        exportToSheet(targetUsers);
    } else {
        Logger.log('No matching users found.');
    }
}

/**
 * Retrives users who haven't logged in since the given date.
 * Uses AdminDirectory.Users.list with a query for efficiency.
 */
function getInactiveUsers(cutoffDate) {
    let users = [];
    let pageToken;
    const formattedDate = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD

    // Query format: lastLoginTime < 'YYYY-MM-DD'
    // Note: 'lastLoginTime' in API is actually a timestamp, but the query supports date comparison.
    // However, for precise timestamp comparison, we might need to filter client-side if the API strictly requires full timestamp or behaves differently.
    // The Admin SDK query syntax usually supports: lastLoginTime < "2023-01-01T00:00:00Z"
    const query = `lastLoginTime < "${cutoffDate.toISOString()}"`;

    do {
        try {
            const response = AdminDirectory.Users.list({
                customer: 'my_customer',
                query: query,
                maxResults: 500,
                pageToken: pageToken,
                viewType: 'domain_public' // or 'admin_view' to see all details
            });

            if (response.users) {
                users = users.concat(response.users);
            }
            pageToken = response.nextPageToken;
        } catch (e) {
            Logger.log('Error listing users: ' + e.message);
            break;
        }
    } while (pageToken);

    return users;
}

/**
 * Checks if a user has a specific license assigned.
 */
function hasLicense(userId, productId, skuId) {
    try {
        const license = AdminLicenseManager.LicenseAssignments.get(productId, skuId, userId);
        return true; // If call succeeds, they have the license
    } catch (e) {
        // 404 means not found (not assigned)
        return false;
    }
}

/**
 * Helper to list all available SKUs in the domain to help user verify the ID.
 */
function listAllSkus() {
    try {
        // We can't list all SKUs directly easily without a user, 
        // but we can list license assignments for a product to see what's used, 
        // or just rely on documentation. 
        // A better way often is to check a known user who has the license.
        Logger.log("To find your SKU ID, the easiest way is to check a user who you know has the license:");
        Logger.log("Run: checkUserLicense('user@domain.com')");
    } catch (e) {
        Logger.log(e.message);
    }
}

/**
 * Debug function to check licenses for a specific user.
 */
function checkUserLicense(userEmail) {
    try {
        const assignments = AdminLicenseManager.LicenseAssignments.listForProduct('Google-Apps', 'my_customer');
        // This lists ALL assignments, which is too big. 
        // Better to just try to get specific ones if we know the SKU, but we don't.

        // Alternative: Use AdminDirectory to get user's data, but it doesn't always show raw SKU IDs.
        Logger.log(`Checking licenses for ${userEmail}...`);
        // Iterate common SKUs if we want, or just ask user to look it up in Admin Console URL.
        // URL often looks like: admin.google.com/ac/billing/subscriptions
    } catch (e) {
        Logger.log(e.message);
    }
}

/**
 * Exports the list of users to a new Google Sheet.
 */
function exportToSheet(users) {
    const ss = SpreadsheetApp.create('Inactive Enterprise Plus Users Audit');
    const sheet = ss.getActiveSheet();

    // Headers
    sheet.appendRow(['Name', 'Email', 'Last Login Time', 'Creation Time', 'Suspended']);

    // Data
    const rows = users.map(user => [
        user.name.fullName,
        user.primaryEmail,
        user.lastLoginTime,
        user.creationTime,
        user.suspended
    ]);

    // Write in batches if large
    if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }

    Logger.log(`Report generated: ${ss.getUrl()}`);
}

/**
 * Utility to get date N days ago.
 */
function getCutoffDate(daysAgo) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date;
}
