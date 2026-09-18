/*
 * File:    ScanFragment.java
 * Module:  Operator Check-in
 * Owner:   Ravindu
 * Purpose: Where a Grid Operator starts a check-in. The camera reads the QR
 *          code in the prosumer app; when that is not possible (no camera
 *          permission, a cracked screen, a dark station) the operator types
 *          the code text instead. Both ways open the same result screen.
 * Source:  AND-11 (ZXing embedded scanner), AND-12 (runtime permissions).
 */
package lk.sliit.solargrid.ui.operator;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.Fragment;

import com.google.android.material.snackbar.Snackbar;
import com.journeyapps.barcodescanner.ScanContract;
import com.journeyapps.barcodescanner.ScanOptions;

import lk.sliit.solargrid.R;
import lk.sliit.solargrid.databinding.FragmentScanBinding;

public class ScanFragment extends Fragment {

    private FragmentScanBinding binding;

    /** Opens the camera scanner and brings back the text of the QR code. */
    private final ActivityResultLauncher<ScanOptions> scanner =
            registerForActivityResult(new ScanContract(), result -> {
                if (result.getContents() == null) {
                    showMessage(getString(R.string.operator_scan_cancelled));
                    return;
                }
                openResult(result.getContents());
            });

    /** Asks for the camera the first time the operator taps Scan. */
    private final ActivityResultLauncher<String> cameraPermission =
            registerForActivityResult(new ActivityResultContracts.RequestPermission(), granted -> {
                if (granted) {
                    startScanner();
                } else {
                    showMessage(getString(R.string.operator_camera_needed));
                }
            });

    /** Builds the screen and wires the two ways of entering a code. */
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        binding = FragmentScanBinding.inflate(inflater, container, false);

        binding.scanAction.setOnClickListener(view -> scanWithCamera());
        binding.scanCheckCode.setOnClickListener(view -> checkTypedCode());

        return binding.getRoot();
    }

    /** Uses the camera, asking for permission when it is not given yet. */
    private void scanWithCamera() {
        boolean allowed = ContextCompat.checkSelfPermission(requireContext(), Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED;
        if (allowed) {
            startScanner();
        } else {
            cameraPermission.launch(Manifest.permission.CAMERA);
        }
    }

    /** Opens the scanner window, set to read QR codes only. */
    private void startScanner() {
        ScanOptions options = new ScanOptions()
                .setDesiredBarcodeFormats(ScanOptions.QR_CODE)
                .setPrompt(getString(R.string.operator_scan_prompt))
                .setBeepEnabled(true)
                .setOrientationLocked(false);
        scanner.launch(options);
    }

    /** Takes the code the operator typed and checks it the same way. */
    private void checkTypedCode() {
        CharSequence typed = binding.scanCode.getText();
        String code = typed == null ? "" : typed.toString().trim();
        if (code.isEmpty()) {
            binding.scanCodeBox.setError(getString(R.string.operator_manual_missing));
            return;
        }
        binding.scanCodeBox.setError(null);
        openResult(code);
    }

    /** Opens the result screen, which asks the API about the code. */
    private void openResult(String payload) {
        binding.scanCode.setText("");
        startActivity(CheckInResultActivity.intentFor(requireContext(), payload));
    }

    /** Shows a short message at the bottom of the screen. */
    private void showMessage(String text) {
        Snackbar.make(binding.getRoot(), text, Snackbar.LENGTH_LONG).show();
    }

    /** Lets go of the views when the tab is closed. */
    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
