/*
 * File:    SplashActivity.java
 * Module:  Authentication
 * Owner:   Ravindu
 * Purpose: The screen the app opens on. It reads the login saved in SQLite,
 *          asks the API whether that login still works, and then opens the
 *          home screen of the right role. With no network the saved details
 *          are used, so the app still opens.
 */
package lk.sliit.solargrid.ui.auth;

import android.annotation.SuppressLint;
import android.os.Bundle;

import androidx.annotation.Nullable;

import lk.sliit.solargrid.R;
import lk.sliit.solargrid.data.model.Roles;
import lk.sliit.solargrid.data.model.Session;
import lk.sliit.solargrid.data.remote.ApiCallback;
import lk.sliit.solargrid.data.remote.ApiError;
import lk.sliit.solargrid.data.remote.dto.UserDto;
import lk.sliit.solargrid.databinding.ActivitySplashBinding;
import lk.sliit.solargrid.ui.common.BaseActivity;

// This screen is not a branding splash: it reads the saved login and decides
// which home screen to open, which the system splash screen cannot do.
@SuppressLint("CustomSplashScreen")
public class SplashActivity extends BaseActivity {

    /** Shows the app mark and starts reading the saved login. */
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(ActivitySplashBinding.inflate(getLayoutInflater()).getRoot());

        sessions().load(this::decideWhereToGo);
    }

    /** Chooses the next screen once the saved login has been read. */
    private void decideWhereToGo(@Nullable Session session) {
        if (session == null) {
            goToLogin(null);
            return;
        }
        if (!session.isLive()) {
            app().auth().logOut();
            goToLogin(getString(R.string.session_expired));
            return;
        }
        if (Roles.isBackoffice(session.user.role)) {
            app().auth().logOut();
            goToLogin(getString(R.string.login_backoffice));
            return;
        }
        checkWithServer(session);
    }

    /**
     * Asks the API who the token belongs to. This catches an account that was
     * deactivated, or a role that changed, before any screen shows old
     * details.
     */
    private void checkWithServer(Session session) {
        app().auth().refreshUser(new ApiCallback<UserDto>() {

            /** The token still works, so the newest role decides the screen. */
            @Override
            public void onSuccess(UserDto user) {
                openHomeForRole(user == null ? session.user.role : user.role);
            }

            /** A refused token means logging in again; no network does not. */
            @Override
            public void onError(ApiError error) {
                if (handledSessionEnd(error)) {
                    return;
                }
                openHomeForRole(session.user.role);
            }
        });
    }
}
