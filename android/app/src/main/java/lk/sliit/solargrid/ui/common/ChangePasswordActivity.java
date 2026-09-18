/*
 * File:    ChangePasswordActivity.java
 * Module:  Prosumer Accounts
 * Owner:   Malith
 * Purpose: Changes the password of whoever is signed in. The phone checks that
 *          the new password was typed the same way twice; the API checks the
 *          current password and the password rules.
 */
package lk.sliit.solargrid.ui.common;

import android.os.Bundle;
import android.view.View;

import androidx.annotation.Nullable;

import java.util.Map;

import lk.sliit.solargrid.R;
import lk.sliit.solargrid.data.remote.ApiCallback;
import lk.sliit.solargrid.data.remote.ApiError;
import lk.sliit.solargrid.databinding.ActivityChangePasswordBinding;

public class ChangePasswordActivity extends BaseActivity {

    private ActivityChangePasswordBinding binding;

    /** Builds the form. */
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityChangePasswordBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        leaveRoomForSystemBars(binding.getRoot());

        binding.passwordBack.setOnClickListener(view -> finish());
        binding.passwordSave.setOnClickListener(view -> save());
    }

    /** Checks the three boxes, then asks the API to change the password. */
    private void save() {
        Forms.clearErrors(binding.passwordCurrentBox, binding.passwordNewBox, binding.passwordConfirmBox);
        Notices.hide(binding.passwordNotice);

        String needed = getString(R.string.field_required);
        boolean ready = Forms.required(binding.passwordCurrentBox, binding.passwordCurrent, needed);
        ready &= Forms.required(binding.passwordNewBox, binding.passwordNew, needed);
        ready &= Forms.required(binding.passwordConfirmBox, binding.passwordConfirm, needed);
        if (ready && !Forms.text(binding.passwordNew).equals(Forms.text(binding.passwordConfirm))) {
            binding.passwordConfirmBox.setError(getString(R.string.password_mismatch));
            ready = false;
        }
        if (!ready) {
            return;
        }

        setBusy(true);
        app().auth().changePassword(Forms.text(binding.passwordCurrent), Forms.text(binding.passwordNew),
                new ApiCallback<Void>() {

                    /** The new password works from the next login. */
                    @Override
                    public void onSuccess(Void nothing) {
                        setBusy(false);
                        binding.passwordCurrent.setText("");
                        binding.passwordNew.setText("");
                        binding.passwordConfirm.setText("");
                        Notices.success(binding.passwordNotice, getString(R.string.account_password_changed));
                    }

                    /** A wrong current password or a weak new one. */
                    @Override
                    public void onError(ApiError error) {
                        setBusy(false);
                        if (handledSessionEnd(error)) {
                            return;
                        }
                        boolean marked = Forms.showFieldErrors(error, Map.of(
                                "currentPassword", binding.passwordCurrentBox,
                                "newPassword", binding.passwordNewBox));
                        Notices.problem(binding.passwordNotice,
                                marked ? getString(R.string.form_check_marked) : error.message);
                    }
                });
    }

    /** Turns the button off and the progress bar on while the API answers. */
    private void setBusy(boolean busy) {
        binding.passwordSave.setEnabled(!busy);
        binding.passwordProgress.setVisibility(busy ? View.VISIBLE : View.INVISIBLE);
    }
}
