/*
 * File:    BaseActivity.java
 * Module:  Shared screens
 * Owner:   Ravindu
 * Purpose: The things every screen in the app needs: quick access to the
 *          shared objects, one way of showing a message, one way of sending
 *          the user back to the login screen when the session ends, and the
 *          local network permission that Android 17 asks for.
 * Source:  AND-12 (asking for a permission), AND-23 (local network permission).
 */
package lk.sliit.solargrid.ui.common;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.google.android.material.snackbar.Snackbar;

import lk.sliit.solargrid.AppContainer;
import lk.sliit.solargrid.R;
import lk.sliit.solargrid.data.model.Roles;
import lk.sliit.solargrid.data.remote.ApiError;
import lk.sliit.solargrid.session.SessionStore;
import lk.sliit.solargrid.ui.auth.LoginActivity;
import lk.sliit.solargrid.ui.operator.OperatorActivity;
import lk.sliit.solargrid.ui.prosumer.MainActivity;
import lk.sliit.solargrid.util.LocalNetwork;

public abstract class BaseActivity extends AppCompatActivity {

    /** Asks for the local network permission and hands the answer back. */
    private final ActivityResultLauncher<String> localNetworkRequest =
            registerForActivityResult(new ActivityResultContracts.RequestPermission(), this::onLocalNetworkAnswer);

    private Runnable whenAllowed;
    private Runnable whenRefused;

    /**
     * Newer Android versions draw the app behind the status bar and the
     * navigation bar, so every screen says it will leave room for them itself.
     */
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    }

    /**
     * Keeps the content clear of the status bar, the navigation bar, a camera
     * notch and the keyboard. Each screen calls this with the view it filled
     * the window with.
     */
    protected void leaveRoomForSystemBars(View root) {
        ViewCompat.setOnApplyWindowInsetsListener(root, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars()
                    | WindowInsetsCompat.Type.displayCutout()
                    | WindowInsetsCompat.Type.ime());
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return WindowInsetsCompat.CONSUMED;
        });
    }

    /**
     * Runs the request once the app may reach the server. Android 17 blocks a
     * server on the local network (such as the development computer) until
     * the user allows it, so the permission is asked for first when needed.
     */
    protected void withLocalNetwork(Runnable allowed, Runnable refused) {
        if (!LocalNetwork.needsPermission(this, app().baseUrl())) {
            allowed.run();
            return;
        }
        whenAllowed = allowed;
        whenRefused = refused;
        localNetworkRequest.launch(LocalNetwork.PERMISSION);
    }

    /** Carries on with whatever was waiting for the permission answer. */
    private void onLocalNetworkAnswer(boolean granted) {
        Runnable next = granted ? whenAllowed : whenRefused;
        whenAllowed = null;
        whenRefused = null;
        if (next != null) {
            next.run();
        }
    }

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
