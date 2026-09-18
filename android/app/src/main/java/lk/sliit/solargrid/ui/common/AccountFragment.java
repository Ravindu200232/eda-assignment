/*
 * File:    AccountFragment.java
 * Module:  Account
 * Owner:   Ravindu
 * Purpose: The account tab used by both shells. It shows who is signed in,
 *          which server the app is using and lets the user log out. Malith
 *          added the buttons to change the password (everyone) and to edit
 *          the profile or deactivate the account (prosumers only).
 * Source:  AND-27 (a confirmation dialog that asks for the password).
 */
package lk.sliit.solargrid.ui.common;

import android.content.DialogInterface;
import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.StringRes;
import androidx.appcompat.app.AlertDialog;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.Fragment;

import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import lk.sliit.solargrid.AppContainer;
import lk.sliit.solargrid.BuildConfig;
import lk.sliit.solargrid.R;
import lk.sliit.solargrid.data.model.Roles;
import lk.sliit.solargrid.data.remote.ApiCallback;
import lk.sliit.solargrid.data.remote.ApiError;
import lk.sliit.solargrid.data.remote.dto.UserDto;
import lk.sliit.solargrid.databinding.DialogPasswordBinding;
import lk.sliit.solargrid.databinding.FragmentAccountBinding;
import lk.sliit.solargrid.databinding.ViewDetailRowBinding;
import lk.sliit.solargrid.ui.auth.LoginActivity;
import lk.sliit.solargrid.ui.prosumer.ProfileActivity;
import lk.sliit.solargrid.util.Texts;

public class AccountFragment extends Fragment {

    private FragmentAccountBinding binding;

    /** Builds the tab and fills it from the saved session. */
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        binding = FragmentAccountBinding.inflate(inflater, container, false);
        binding.accountLogout.setOnClickListener(view -> askToLogOut());
        binding.accountEditProfile.setOnClickListener(view ->
                startActivity(new Intent(requireContext(), ProfileActivity.class)));
        binding.accountChangePassword.setOnClickListener(view ->
                startActivity(new Intent(requireContext(), ChangePasswordActivity.class)));
        binding.accountDeactivate.setOnClickListener(view -> askToDeactivate());
        return binding.getRoot();
    }

    /** Shows the newest details, for example after the profile was edited. */
    @Override
    public void onResume() {
        super.onResume();
        UserDto user = AppContainer.get().session().user();
        showUser(user);
        boolean prosumer = user != null && Roles.isProsumer(user.role);
        binding.accountEditProfile.setVisibility(prosumer ? View.VISIBLE : View.GONE);
        binding.accountDeactivate.setVisibility(prosumer ? View.VISIBLE : View.GONE);
    }

    /**
     * Asks for the password before closing the account. The dialog stays open
     * when the API refuses, so the prosumer can read why and try again.
     */
    private void askToDeactivate() {
        DialogPasswordBinding form = DialogPasswordBinding.inflate(getLayoutInflater());
        form.dialogMessage.setText(R.string.deactivate_message);

        AlertDialog dialog = new MaterialAlertDialogBuilder(requireContext())
                .setTitle(R.string.deactivate_title)
                .setView(form.getRoot())
                .setNegativeButton(R.string.action_cancel, null)
                .setPositiveButton(R.string.account_deactivate, null)
                .show();

        // The button that closes the account is pink, like every other
        // action in the app that cannot simply be undone.
        dialog.getButton(DialogInterface.BUTTON_POSITIVE)
                .setTextColor(ContextCompat.getColor(requireContext(), R.color.danger));
        dialog.getButton(DialogInterface.BUTTON_POSITIVE).setOnClickListener(view -> {
            String password = Forms.text(form.dialogPassword);
            if (password.isEmpty()) {
                form.dialogPasswordBox.setError(getString(R.string.deactivate_password_needed));
                return;
            }
            form.dialogPasswordBox.setError(null);
            view.setEnabled(false);
            AppContainer.get().prosumers().deactivate(password, new ApiCallback<Void>() {

                /** The account is closed; the login screen explains what happened. */
                @Override
                public void onSuccess(Void nothing) {
                    dialog.dismiss();
                    if (!isAdded()) {
                        return;
                    }
                    Intent intent = new Intent(requireContext(), LoginActivity.class)
                            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK)
                            .putExtra(LoginActivity.EXTRA_MESSAGE, getString(R.string.deactivate_done));
                    startActivity(intent);
                    requireActivity().finish();
                }

                /** A wrong password, or the API refused for another reason. */
                @Override
                public void onError(ApiError error) {
                    if (!isAdded()) {
                        return;
                    }
                    view.setEnabled(true);
                    form.dialogPasswordBox.setError(error.message);
                }
            });
        });
    }

    /** Fills the name, the role chip and every details row. */
    private void showUser(@Nullable UserDto user) {
        binding.accountInitials.setText(Texts.initials(user == null ? null : user.fullName));
        binding.accountName.setText(user == null ? "" : user.fullName);
        binding.accountRoleChip.setText(RoleText.of(requireContext(), user == null ? null : user.role));

        row(binding.accountNicRow, R.string.account_nic, user == null ? null : user.nic);
        row(binding.accountEmailRow, R.string.account_email, user == null ? null : user.email);
        row(binding.accountPhoneRow, R.string.account_phone, user == null ? null : user.phone);
        row(binding.accountStatusRow, R.string.account_status, user == null ? null : user.status);

        row(binding.accountServerRow, R.string.account_server, AppContainer.get().baseUrl());
        row(binding.accountVersionRow, R.string.account_version, BuildConfig.VERSION_NAME);
    }

    /** Writes one label and value line. */
    private void row(ViewDetailRowBinding row, @StringRes int labelRes, @Nullable String value) {
        row.rowLabel.setText(labelRes);
        row.rowValue.setText(Texts.orDash(value));
    }

    /** Asks first, because logging out means typing the password again. */
    private void askToLogOut() {
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle(R.string.account_logout_question)
                .setNegativeButton(R.string.action_cancel, null)
                .setPositiveButton(R.string.account_logout, (dialog, which) -> logOut())
                .show();
    }

    /** Forgets the session and goes back to the login screen. */
    private void logOut() {
        AppContainer.get().auth().logOut();
        Intent intent = new Intent(requireContext(), LoginActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        requireActivity().finish();
    }

    /** Lets go of the views when the tab is closed. */
    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
