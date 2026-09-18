/*
 * File:    LocalNetworkTest.java
 * Module:  Tests
 * Owner:   Ravindu
 * Purpose: Checks which server addresses count as the local network, because
 *          only those need the Android 17 permission before the app can reach
 *          them.
 */
package lk.sliit.solargrid.util;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class LocalNetworkTest {

    /** The computer that runs the emulator is on the local network. */
    @Test
    public void countsTheEmulatorHost() {
        assertTrue(LocalNetwork.isOnLocalNetwork("http://10.0.2.2:8080/"));
    }

    /** Home and campus Wi-Fi addresses count too. */
    @Test
    public void countsPrivateWifiAddresses() {
        assertTrue(LocalNetwork.isOnLocalNetwork("http://192.168.1.5:8080/"));
        assertTrue(LocalNetwork.isOnLocalNetwork("http://172.20.4.10/"));
        assertTrue(LocalNetwork.isOnLocalNetwork("http://solargrid-pc.local:8080/"));
        assertTrue(LocalNetwork.isOnLocalNetwork("http://[fd00::12]:8080/"));
    }

    /** The phone itself is not the local network, so the tests need no permission. */
    @Test
    public void leavesOutThePhoneItself() {
        assertFalse(LocalNetwork.isOnLocalNetwork("http://localhost:5090/"));
        assertFalse(LocalNetwork.isOnLocalNetwork("http://127.0.0.1:5090/"));
    }

    /** A server on the internet needs no permission. */
    @Test
    public void leavesOutInternetServers() {
        assertFalse(LocalNetwork.isOnLocalNetwork("https://api.example.com/"));
        assertFalse(LocalNetwork.isOnLocalNetwork("http://8.8.8.8/"));
        assertFalse(LocalNetwork.isOnLocalNetwork("http://172.32.0.1/"));
    }

    /** Text that is not an address is not treated as one. */
    @Test
    public void ignoresBrokenAddresses() {
        assertFalse(LocalNetwork.isOnLocalNetwork(null));
        assertFalse(LocalNetwork.isOnLocalNetwork("not an address"));
    }
}
