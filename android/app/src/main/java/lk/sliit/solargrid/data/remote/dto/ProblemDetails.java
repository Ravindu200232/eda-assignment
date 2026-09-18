/*
 * File:    ProblemDetails.java
 * Module:  API access
 * Owner:   Ravindu
 * Purpose: The error body the Web API sends (RFC 7807). Validation problems
 *          also carry a field list, which the forms use to mark the box that
 *          needs fixing.
 * Source:  AND-19 (ProblemDetails error format).
 */
package lk.sliit.solargrid.data.remote.dto;

import java.util.List;
import java.util.Map;

public class ProblemDetails {

    public String type;

    /** Short headline, for example "Validation failed". */
    public String title;

    public Integer status;

    /** The sentence written for the user, when the API adds one. */
    public String detail;

    /** Field name, then the messages for that field. */
    public Map<String, List<String>> errors;
}
