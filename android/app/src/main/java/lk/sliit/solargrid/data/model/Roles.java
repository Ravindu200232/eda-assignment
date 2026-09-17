/*
 * File:    Roles.java
 * Module:  Core
 * Owner:   Ravindu
 * Purpose: The role and status words the Web API sends. Keeping them in one
 *          place stops spelling mistakes in the screens.
 */
package lk.sliit.solargrid.data.model;

public final class Roles {

    public static final String PROSUMER = "Prosumer";
    public static final String GRID_OPERATOR = "GridOperator";
    public static final String BACKOFFICE = "Backoffice";

    public static final String STATUS_PENDING = "Pending";
    public static final String STATUS_ACTIVE = "Active";
    public static final String STATUS_DEACTIVATED = "Deactivated";

    /** Nobody builds this class; it only holds words. */
    private Roles() {
    }

    /** True for a prosumer, who gets the booking screens. */
    public static boolean isProsumer(String role) {
        return PROSUMER.equals(role);
    }

    /** True for a Grid Operator, who gets the scanning screens. */
    public static boolean isOperator(String role) {
        return GRID_OPERATOR.equals(role);
    }

    /** True for Backoffice staff, who work in the web portal instead. */
    public static boolean isBackoffice(String role) {
        return BACKOFFICE.equals(role);
    }
}
