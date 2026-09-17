/*
 * File:    BaseActivity.java
 * Module:  Shared screens
 * Owner:   Ravindu
 * Purpose: The things every screen in the app needs: quick access to the
 *          shared objects, one way of showing a message, and one way of
 *          sending the user back to the login screen when the session ends.
 */
package lk.sliit.solargrid.ui.common;

import android.content.Intent;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.snackbar.Snackbar;

import lk.sliit.solargrid.AppContainer;
import lk.sliit.solargrid.R;
import lk.sliit.solargrid.data.model.Roles;
import lk.sliit.solargrid.data.remote.ApiError;
import lk.sliit.solargrid.session.SessionStore;
import lk.sliit.solargrid.ui.auth.LoginActivity;
import lk.sliit.solargrid.ui.operator.OperatorActivity;
import lk.sliit.solargrid.ui.prosumer.MainActivity;

public abstract class BaseActivity extends AppCompatActivity {

    /** The shared objects of the app (API, database, session). */
    protected AppContainer app() {
        return AppContainer.get();
    }

    /** The signed-in user and their token. */
    protected SessionStore sessions() {
        return app().session();
    }

    /** Shows a short message at the bottom of the screen. */
    protected void showMessage(String text) {
        if (text == null || text.trim().isEmpty()) {
            return;
        }
        Snackbar.make(findViewById(android.R.id.content), text, Snackbar.LENGTH_LONG).show();
    }

    /**
     * Sends the user to the login screen when the API refused the token.
     * Returns true when it did, so the caller can stop working on the answer.
     */
    protected boolean handledSessionEnd(ApiError error) {
        if (error == null || !error.isSessionEnded()) {
            return false;
        }
        goToLogin(error.message);
        return true;
    }

    /** Opens the login screen and closes everything behind it. */
    protected void goToLogin(@Nullable String message) {
        Intent intent = new Intent(this, LoginActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        if (message != null && !message.trim().isEmpty()) {
            intent.putExtra(LoginActivity.EXTRA_MESSAGE, message);
        }
        startActivity(intent);
        finish();
    }

    /**
     * Opens the home screen that belongs to the role. Backoffice staff work in
     * the web portal, so they are sent back with an explanation instead.
     */
    protected void openHomeForRole(@Nullable String role) {
        Intent intent;
        if (Roles.isProsumer(role)) {
            intent = new Intent(this, MainActivity.class);
        } else if (Roles.isOperator(role)) {
            intent = new Intent(this, OperatorActivity.class);
        } else {
            app().auth().logOut();
            goToLogin(getString(R.string.login_backoffice));
            return;
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }
}
