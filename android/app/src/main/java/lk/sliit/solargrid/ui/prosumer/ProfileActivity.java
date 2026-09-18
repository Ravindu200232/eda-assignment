/*
 * File:    ProfileActivity.java
 * Module:  Prosumer Accounts
 * Owner:   Malith
 * Purpose: Lets a prosumer keep their details up to date. The copy saved on
 *          the phone is shown first, then replaced by the newest one from the
 *          API. Saving sends every field, because the API replaces the whole
 *          profile.
 */
package lk.sliit.solargrid.ui.prosumer;

import android.os.Bundle;
import android.view.View;

import androidx.annotation.Nullable;

import com.google.android.material.textfield.TextInputLayout;

import java.util.Map;

import lk.sliit.solargrid.R;
import lk.sliit.solargrid.data.remote.ApiCallback;
import lk.sliit.solargrid.data.remote.ApiError;
import lk.sliit.solargrid.data.remote.dto.UpdateProsumerRequest;
import lk.sliit.solargrid.data.remote.dto.UserDto;
import lk.sliit.solargrid.databinding.ActivityProfileBinding;
import lk.sliit.solargrid.ui.common.BaseActivity;
import lk.sliit.solargrid.ui.common.Forms;
import lk.sliit.solargrid.ui.common.Notices;
import lk.sliit.solargrid.ui.common.StatusChips;
import lk.sliit.solargrid.util.Texts;

public class ProfileActivity extends BaseActivity {

    private ActivityProfileBinding binding;
    private UserDto shown;

    /** Builds the form and fills it. */
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityProfileBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        leaveRoomForSystemBars(binding.getRoot());

        binding.profileBack.setOnClickListener(view -> finish());
        binding.profileSave.setOnClickListener(view -> save());

        setBusy(true);
        app().prosumers().savedProfile(saved -> {
            if (saved != null && shown == null) {
                fill(saved);
            }
        });
        withLocalNetwork(this::refresh, () -> {
            setBusy(false);
            Notices.problem(binding.profileNotice, getString(R.string.local_network_refused));
        });
    }

    /** Asks the API for the newest profile. */
    private void refresh() {
        app().prosumers().refreshProfile(new ApiCallback<UserDto>() {

            /** The newest details replace the saved ones. */
            @Override
            public void onSuccess(UserDto profile) {
                setBusy(false);
                if (profile != null) {
                    fill(profile);
                }
            }

            /** Without a connection the saved copy stays on screen. */
            @Override
            public void onError(ApiError error) {
                setBusy(false);
                if (handledSessionEnd(error)) {
                    return;
                }
                Notices.problem(binding.profileNotice, error.isOffline()
                        ? getString(R.string.profile_offline, error.message)
                        : error.message);
            }
        });
    }

    /** Writes a profile into the boxes. */
    private void fill(UserDto profile) {
        shown = profile;
        binding.profileNic.setText(Texts.orDash(profile.nic));
        StatusChips.applyAccount(binding.profileStatus, profile.status);
        binding.profileName.setText(profile.fullName);
        binding.profileEmail.setText(profile.email);
        binding.profilePhone.setText(profile.phone);
        binding.profileAddress.setText(profile.address);
        binding.profileMeter.setText(profile.meterNumber);
        binding.profileSolar.setText(profile.solarCapacityKw == null ? "" : Texts.number(profile.solarCapacityKw));
    }

    /** Checks the boxes the phone can check, then sends the whole profile. */
    private void save() {
        if (shown == null) {
            return;
        }
        Forms.clearErrors(binding.profileNameBox, binding.profileEmailBox, binding.profilePhoneBox,
                binding.profileAddressBox, binding.profileMeterBox, binding.profileSolarBox);
        Notices.hide(binding.profileNotice);

        String needed = getString(R.string.field_required);
        boolean ready = Forms.required(binding.profileNameBox, binding.profileName, needed);
        ready &= Forms.required(binding.profileEmailBox, binding.profileEmail, needed);
        ready &= Forms.required(binding.profilePhoneBox, binding.profilePhone, needed);
        ready &= Forms.required(binding.profileAddressBox, binding.profileAddress, needed);

        Double solar = Forms.number(binding.profileSolar);
        if (solar != null && solar.isNaN()) {
            binding.profileSolarBox.setError(getString(R.string.number_needed));
            ready = false;
        }
        if (!ready) {
            return;
        }

        UpdateProsumerRequest request = UpdateProsumerRequest.from(shown);
        request.fullName = Forms.text(binding.profileName);
        request.email = Forms.text(binding.profileEmail);
        request.phone = Forms.text(binding.profilePhone);
        request.address = Forms.text(binding.profileAddress);
        request.meterNumber = Forms.textOrNull(binding.profileMeter);
        request.solarCapacityKw = solar;

        setBusy(true);
        app().prosumers().updateProfile(request, new ApiCallback<UserDto>() {

            /** The API kept the changes; the saved copy is updated too. */
            @Override
            public void onSuccess(UserDto profile) {
                setBusy(false);
                if (profile != null) {
                    fill(profile);
                }
                Notices.success(binding.profileNotice, getString(R.string.profile_saved));
            }

            /** Marks the boxes the API named, or explains the refusal. */
            @Override
            public void onError(ApiError error) {
                setBusy(false);
                if (handledSessionEnd(error)) {
                    return;
                }
                boolean marked = Forms.showFieldErrors(error, boxes());
                Notices.problem(binding.profileNotice, marked ? getString(R.string.form_check_marked) : error.message);
            }
        });
    }

    /** API field name, then the box that shows its message. */
    private Map<String, TextInputLayout> boxes() {
        return Map.of(
                "fullName", binding.profileNameBox,
                "email", binding.profileEmailBox,
                "phone", binding.profilePhoneBox,
                "address", binding.profileAddressBox,
                "meterNumber", binding.profileMeterBox,
                "solarCapacityKw", binding.profileSolarBox);
    }

    /** Turns the button off and the progress bar on while the API answers. */
    private void setBusy(boolean busy) {
        binding.profileSave.setEnabled(!busy);
        binding.profileProgress.setVisibility(busy ? View.VISIBLE : View.INVISIBLE);
    }
}
