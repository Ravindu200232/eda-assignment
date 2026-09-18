/*
 * File:    LoginActivity.java
 * Module:  Authentication
 * Owner:   Ravindu
 * Purpose: The sign-in screen. It only checks that both boxes are filled; the
 *          API decides whether the account may sign in, and its message is
 *          shown exactly as it came, so a pending or deactivated prosumer
 *          learns what to do next.
 */
package lk.sliit.solargrid.ui.auth;

import android.os.Bundle;
import android.view.View;
import android.view.inputmethod.EditorInfo;

import androidx.annotation.Nullable;

import lk.sliit.solargrid.BuildConfig;
import lk.sliit.solargrid.R;
import lk.sliit.solargrid.data.model.Roles;
import lk.sliit.solargrid.data.model.Session;
import lk.sliit.solargrid.data.remote.ApiCallback;
import lk.sliit.solargrid.data.remote.ApiError;
import lk.sliit.solargrid.databinding.ActivityLoginBinding;
import lk.sliit.solargrid.ui.common.BaseActivity;

public class LoginActivity extends BaseActivity {

    /** Message to show at the top, for example why the last session ended. */
    public static final String EXTRA_MESSAGE = "message";

    private ActivityLoginBinding binding;

    /** Builds the form and shows any message that brought the user here. */
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityLoginBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        leaveRoomForSystemBars(binding.getRoot());

        // The address is a help while developing and testing; a release build
        // does not show where the server lives.
        binding.loginApiAddress.setText(getString(R.string.api_address, app().baseUrl()));
        binding.loginApiAddress.setVisibility(BuildConfig.DEBUG ? View.VISIBLE : View.GONE);
        showNotice(noticeToShow());

        binding.loginSubmit.setOnClickListener(view -> submit());
        binding.loginPassword.setOnEditorActionListener((view, actionId, event) -> {
            // The keyboard "done" key signs in as well.
            if (actionId == EditorInfo.IME_ACTION_DONE) {
                submit();
                return true;
            }
            return false;
        });
    }

    /** The message from the screen that sent us here, or from a lost session. */
    @Nullable
    private String noticeToShow() {
        String fromIntent = getIntent().getStringExtra(EXTRA_MESSAGE);
        return fromIntent != null ? fromIntent : sessions().takeEndedReason();
    }

    /** Checks the two boxes and that the server may be reached, then signs in. */
    private void submit() {
        String username = text(binding.loginUsername.getText());
        String password = text(binding.loginPassword.getText());

        binding.loginUsernameBox.setError(null);
        binding.loginPasswordBox.setError(null);
        showNotice(null);

        boolean ready = true;
        if (username.isEmpty()) {
            binding.loginUsernameBox.setError(getString(R.string.login_missing_username));
            ready = false;
        }
        if (password.isEmpty()) {
            binding.loginPasswordBox.setError(getString(R.string.login_missing_password));
            ready = false;
        }
        if (!ready) {
            return;
        }

        withLocalNetwork(() -> sendLogin(username, password),
                () -> showNotice(getString(R.string.local_network_refused)));
    }

    /** Asks the API to sign the user in. */
    private void sendLogin(String username, String password) {
        setBusy(true);
        app().auth().login(username, password, new ApiCallback<Session>() {

            /** Signed in: the role decides which home screen opens. */
            @Override
            public void onSuccess(Session session) {
                setBusy(false);
                if (Roles.isBackoffice(session.user.role)) {
                    app().auth().logOut();
                    showNotice(getString(R.string.login_backoffice));
                    return;
                }
                openHomeForRole(session.user.role);
            }

            /** Wrong details, a refused account, or the server is not there. */
            @Override
            public void onError(ApiError error) {
                setBusy(false);
                binding.loginUsernameBox.setError(error.fieldError("username"));
                binding.loginPasswordBox.setError(error.fieldError("password"));
                showNotice(error.message);
            }
        });
    }

    /** Shows or hides the message box above the form. */
    private void showNotice(@Nullable String message) {
        if (message == null || message.trim().isEmpty()) {
            binding.loginNotice.setVisibility(View.GONE);
            return;
        }
        binding.loginNotice.setText(message);
        binding.loginNotice.setVisibility(View.VISIBLE);
    }

    /** Turns the button off and the progress bar on while the API answers. */
    private void setBusy(boolean busy) {
        binding.loginSubmit.setEnabled(!busy);
        binding.loginProgress.setVisibility(busy ? View.VISIBLE : View.INVISIBLE);
    }

    /** The text of a box, without the spaces around it. */
    private static String text(@Nullable CharSequence value) {
        return value == null ? "" : value.toString().trim();
    }
}
