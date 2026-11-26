package com.laryko;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MultiSessionPlugin.class);
        registerPlugin(NativeAndroidBridge.class);
        super.onCreate(savedInstanceState);
    }
}
