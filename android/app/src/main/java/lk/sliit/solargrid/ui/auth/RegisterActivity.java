/*
 * File:    RegisterActivity.java
 * Module:  Prosumer Accounts
 * Owner:   Malith
 * Purpose: The sign-up screen. It checks only what the phone can check alone
 *          (empty boxes, the two passwords match, the solar size is a number).
 *          The NIC format, a NIC or email already in use and the password
 *          rules are decided by the API, and its messages are shown under the
 *          right box or above the button.
 */
package lk.sliit.solargrid.ui.auth;

import android.os.Bundle;
import android.view.View;
import android.view.inputmethod.EditorInfo;

import androidx.annotation.Nullable;

import com.google.android.material.textfield.TextInputLayout;

import java.util.Locale;
import java.util.Map;

import lk.sliit.solargrid.R;
import lk.sliit.solargrid.data.remote.ApiCallback;
import lk.sliit.solargrid.data.remote.ApiError;
import lk.sliit.solargrid.data.remote.dto.RegisterProsumerRequest;
import lk.sliit.solargrid.data.remote.dto.UserDto;
import lk.sliit.solargrid.databinding.ActivityRegisterBinding;
import lk.sliit.solargrid.ui.common.BaseActivity;
import lk.sliit.solargrid.ui.common.Forms;

public class RegisterActivity extends BaseActivity {

    private ActivityRegisterBinding binding;

    /** Builds the form. */
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityRegisterBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        leaveRoomForSystemBars(binding.getRoot());

        binding.registerBack.setOnClickListener(view -> finish());
        binding.registerHaveAccount.setOnClickListener(view -> finish());
        binding.registerSubmit.setOnClickListener(view -> submit());
        binding.registerConfirm.setOnEditorActionListener((view, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_DONE) {
                submit();
                return true;
            }
            return false;
        });
    }

    /** Checks the boxes the phone can check, then sends the sign-up. */
    private void submit() {
        Forms.clearErrors(binding.registerNicBox, binding.registerNameBox, binding.registerEmailBox,
                binding.registerPhoneBox, binding.registerAddressBox, binding.registerMeterBox,
                binding.registerSolarBox, binding.registerPasswordBox, binding.registerConfirmBox);
        showNotice(null);

        String needed = getString(R.string.field_required);
        boolean ready = Forms.required(binding.registerNicBox, binding.registerNic, needed);
        ready &= Forms.required(binding.registerNameBox, binding.registerName, needed);
        ready &= Forms.required(binding.registerEmailBox, binding.registerEmail, needed);
        ready &= Forms.required(binding.registerPhoneBox, binding.registerPhone, needed);
        ready &= Forms.required(binding.registerAddressBox, binding.registerAddress, needed);
        ready &= Forms.required(binding.registerPasswordBox, binding.registerPassword, needed);
        ready &= Forms.required(binding.registerConfirmBox, binding.registerConfirm, needed);

        if (ready && !Forms.text(binding.registerPassword).equals(Forms.text(binding.registerConfirm))) {
            binding.registerConfirmBox.setError(getString(R.string.password_mismatch));
            ready = false;
        }

        Double solar = Forms.number(binding.registerSolar);
        if (solar != null && solar.isNaN()) {
            binding.registerSolarBox.setError(getString(R.string.number_needed));
            ready = false;
        }
        if (!ready) {
            return;
        }

        RegisterProsumerRequest request = new RegisterProsumerRequest();
        request.nic = Forms.text(binding.registerNic).toUpperCase(Locale.ROOT);
        request.fullName = Forms.text(binding.registerName);
        request.email = Forms.text(binding.registerEmail);
        request.phone = Forms.text(binding.registerPhone);
        request.address = Forms.text(binding.registerAddress);
        request.meterNumber = Forms.textOrNull(binding.registerMeter);
        request.solarCapacityKw = solar;
        request.password = Forms.text(binding.registerPassword);

        withLocalNetwork(() -> send(request), () -> showNotice(getString(R.string.local_network_refused)));
    }

    /** Sends the sign-up and opens the "waiting for activation" screen. */
    private void send(RegisterProsumerRequest request) {
        setBusy(true);
        app().prosumers().register(request, new ApiCallback<UserDto>() {

            /** The account exists now and waits for Backoffice. */
            @Override
            public void onSuccess(UserDto account) {
                setBusy(false);
                String name = account == null ? request.fullName : account.fullName;
                String nic = account == null ? request.nic : account.nic;
                startActivity(RegisteredActivity.intentFor(RegisterActivity.this, name, nic));
                finish();
            }

            /** Marks the boxes the API named, or explains the refusal. */
            @Override
            public void onError(ApiError error) {
                setBusy(false);
                boolean marked = Forms.showFieldErrors(error, boxes());
                showNotice(marked ? getString(R.string.form_check_marked) : error.message);
            }
        });
    }

    /** API field name, then the box that shows its message. */
    private Map<String, TextInputLayout> boxes() {
        return Map.of(
                "nic", binding.registerNicBox,
                "fullName", binding.registerNameBox,
                "email", binding.registerEmailBox,
                "phone", binding.registerPhoneBox,
                "address", binding.registerAddressBox,
                "meterNumber", binding.registerMeterBox,
                "solarCapacityKw", binding.registerSolarBox,
                "password", binding.registerPasswordBox);
    }

    /** Shows or hides the message above the button, and scrolls to it. */
    private void showNotice(@Nullable String message) {
        if (message == null || message.trim().isEmpty()) {
            binding.registerNotice.setVisibility(View.GONE);
            return;
        }
        binding.registerNotice.setText(message);
        binding.registerNotice.setVisibility(View.VISIBLE);
        binding.registerScroll.post(() ->
                binding.registerScroll.smoothScrollTo(0, binding.registerNotice.getTop()));
    }

    /** Turns the button off and the progress bar on while the API answers. */
    private void setBusy(boolean busy) {
        binding.registerSubmit.setEnabled(!busy);
        binding.registerProgress.setVisibility(busy ? View.VISIBLE : View.INVISIBLE);
    }
}
