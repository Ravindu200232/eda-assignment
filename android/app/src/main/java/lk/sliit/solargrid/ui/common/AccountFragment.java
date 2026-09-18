/*
 * File:    AccountFragment.java
 * Module:  Account
 * Owner:   Ravindu
 * Purpose: The account tab used by both shells. It shows who is signed in,
 *          which server the app is using and lets the user log out. Malith
 *          adds the profile buttons for prosumers into the empty box that the
 *          layout keeps for them.
 */
package lk.sliit.solargrid.ui.common;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.StringRes;
import androidx.fragment.app.Fragment;

import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import lk.sliit.solargrid.AppContainer;
import lk.sliit.solargrid.BuildConfig;
import lk.sliit.solargrid.R;
import lk.sliit.solargrid.data.remote.dto.UserDto;
import lk.sliit.solargrid.databinding.FragmentAccountBinding;
import lk.sliit.solargrid.databinding.ViewDetailRowBinding;
import lk.sliit.solargrid.ui.auth.LoginActivity;
import lk.sliit.solargrid.util.Texts;

public class AccountFragment extends Fragment {

    private FragmentAccountBinding binding;

    /** Builds the tab and fills it from the saved session. */
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        binding = FragmentAccountBinding.inflate(inflater, container, false);
        showUser(AppContainer.get().session().user());
        binding.accountLogout.setOnClickListener(view -> askToLogOut());
        return binding.getRoot();
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
