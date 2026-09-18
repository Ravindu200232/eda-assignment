/*
 * File:    RegisteredActivity.java
 * Module:  Prosumer Accounts
 * Owner:   Malith
 * Purpose: Tells a new prosumer that the account was created but cannot be
 *          used until the Backoffice activates it, and what to do meanwhile.
 */
package lk.sliit.solargrid.ui.auth;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

import androidx.annotation.Nullable;

import lk.sliit.solargrid.R;
import lk.sliit.solargrid.databinding.ActivityRegisteredBinding;
import lk.sliit.solargrid.ui.common.BaseActivity;
import lk.sliit.solargrid.util.Texts;

public class RegisteredActivity extends BaseActivity {

    private static final String EXTRA_NAME = "name";
    private static final String EXTRA_NIC = "nic";

    /** Opens this screen for the account that was just created. */
    public static Intent intentFor(Context context, String fullName, String nic) {
        return new Intent(context, RegisteredActivity.class)
                .putExtra(EXTRA_NAME, fullName)
                .putExtra(EXTRA_NIC, nic);
    }

    /** Writes the name and NIC into the thank-you message. */
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        ActivityRegisteredBinding binding = ActivityRegisteredBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        leaveRoomForSystemBars(binding.getRoot());

        String fullName = getIntent().getStringExtra(EXTRA_NAME);
        String firstName = Texts.isBlank(fullName) ? "" : fullName.trim().split("\\s+")[0];
        binding.registeredMessage.setText(getString(R.string.registered_message,
                firstName, Texts.orDash(getIntent().getStringExtra(EXTRA_NIC))));

        binding.registeredLogin.setOnClickListener(view -> goToLogin(null));
    }
}
