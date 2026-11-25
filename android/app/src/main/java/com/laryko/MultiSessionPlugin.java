package com.laryko;

import android.app.Dialog;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.webkit.ProfileStore;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.HashMap;
import java.util.Map;

@CapacitorPlugin(name = "MultiSessionPlugin")
public class MultiSessionPlugin extends Plugin {

    private final Map<String, Dialog> activeDialogs = new HashMap<>();
    private final Map<String, WebView> activeWebViews = new HashMap<>();

    @PluginMethod
    public void openSession(PluginCall call) {
        String uuid = call.getString("uuid");
        String title = call.getString("title", "Sesión");
        String url = call.getString("url");

        if (uuid == null || url == null) {
            JSObject res = new JSObject();
            res.put("success", false);
            call.resolve(res);
            return;
        }

        Uri parsed = Uri.parse(url);
        String scheme = parsed.getScheme();
        if (!"https".equalsIgnoreCase(scheme) && !"http".equalsIgnoreCase(scheme)) {
            JSObject res = new JSObject();
            res.put("success", false);
            call.resolve(res);
            return;
        }

        getActivity().runOnUiThread(() -> {
            Dialog existing = activeDialogs.get(uuid);
            if (existing != null && existing.isShowing()) {
                JSObject res = new JSObject();
                res.put("success", true);
                call.resolve(res);
                return;
            }

            Dialog dialog = new Dialog(getContext(), android.R.style.Theme_DeviceDefault_NoActionBar_Fullscreen);
            LinearLayout root = new LinearLayout(getContext());
            root.setOrientation(LinearLayout.VERTICAL);
            root.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            ));

            LinearLayout toolbar = new LinearLayout(getContext());
            toolbar.setOrientation(LinearLayout.HORIZONTAL);
            toolbar.setGravity(Gravity.CENTER_VERTICAL);
            toolbar.setBackgroundColor(Color.parseColor("#111827"));
            toolbar.setPadding(24, 18, 24, 18);

            Button sleepBtn = new Button(getContext());
            sleepBtn.setText("Dormir 💤");
            sleepBtn.setOnClickListener(v -> closeSessionInternal(uuid));

            TextView titleView = new TextView(getContext());
            titleView.setText(title);
            titleView.setTextColor(Color.WHITE);
            titleView.setPadding(24, 0, 24, 0);
            LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
                0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f
            );
            titleView.setLayoutParams(titleParams);

            WebView webView = new WebView(getContext());
            webView.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f
            ));

            if (WebViewFeature.isFeatureSupported(WebViewFeature.MULTI_PROFILE)) {
                WebViewCompat.setProfile(webView, "session_" + uuid);
            }

            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setAllowFileAccess(false);
            settings.setAllowContentAccess(false);

            webView.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    String s = request.getUrl().getScheme();
                    return !"https".equalsIgnoreCase(s) && !"http".equalsIgnoreCase(s);
                }
            });

            Button reloadBtn = new Button(getContext());
            reloadBtn.setText("↻");
            reloadBtn.setOnClickListener(v -> webView.reload());

            toolbar.addView(sleepBtn);
            toolbar.addView(titleView);
            toolbar.addView(reloadBtn);

            root.addView(toolbar);
            root.addView(webView);

            dialog.setContentView(root);
            dialog.setOnDismissListener(d -> closeSessionInternal(uuid));

            activeDialogs.put(uuid, dialog);
            activeWebViews.put(uuid, webView);

            webView.loadUrl(url);
            dialog.show();

            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
        });
    }

    private void closeSessionInternal(String uuid) {
        WebView wv = activeWebViews.remove(uuid);
        if (wv != null) {
            wv.stopLoading();
            wv.destroy();
        }
        Dialog d = activeDialogs.remove(uuid);
        if (d != null && d.isShowing()) {
            d.dismiss();
        }
    }

    @PluginMethod
    public void sleepSession(PluginCall call) {
        String uuid = call.getString("uuid", "");
        getActivity().runOnUiThread(() -> {
            closeSessionInternal(uuid);
            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
        });
    }

    @PluginMethod
    public void sleepAllSessions(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            for (String uuid : activeDialogs.keySet().toArray(new String[0])) {
                closeSessionInternal(uuid);
            }
            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
        });
    }

    @PluginMethod
    public void deleteSessionData(PluginCall call) {
        String uuid = call.getString("uuid", "");
        getActivity().runOnUiThread(() -> {
            closeSessionInternal(uuid);
            if (WebViewFeature.isFeatureSupported(WebViewFeature.MULTI_PROFILE)) {
                try {
                    ProfileStore.getInstance().deleteProfile("session_" + uuid);
                } catch (Exception ignored) {
                }
            }
            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
        });
    }

    @PluginMethod
    public void getActiveSessions(PluginCall call) {
        JSArray arr = new JSArray();
        for (String uuid : activeDialogs.keySet()) {
            arr.put(uuid);
        }
        JSObject res = new JSObject();
        res.put("uuids", arr);
        call.resolve(res);
    }
}
