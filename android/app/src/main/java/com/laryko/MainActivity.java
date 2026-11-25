package com.laryko;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MultiSessionPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
