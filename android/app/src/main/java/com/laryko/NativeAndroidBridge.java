package com.laryko;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "NativeAndroidBridge",
    permissions = {
        @Permission(
            alias = "notifications",
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class NativeAndroidBridge extends Plugin {

    private MediaPlayer alarmPlayer;
    private MediaPlayer notifyPlayer;

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            JSObject res = new JSObject();
            res.put("granted", true);
            call.resolve(res);
            return;
        }
        if (getPermissionState("notifications") == PermissionState.GRANTED ||
            ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            JSObject res = new JSObject();
            res.put("granted", true);
            call.resolve(res);
            return;
        }
        requestPermissionForAlias("notifications", call, "notificationsPermissionCallback");
    }

    @PermissionCallback
    private void notificationsPermissionCallback(PluginCall call) {
        boolean granted = getPermissionState("notifications") == PermissionState.GRANTED ||
            (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
             ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED);
        JSObject res = new JSObject();
        res.put("granted", granted);
        call.resolve(res);
    }

    @PluginMethod
    public void sendNativeNotification(PluginCall call) {
        String id = call.getString("id", String.valueOf(System.currentTimeMillis()));
        String title = call.getString("title", "Laryko");
        String body = call.getString("body", "");
        boolean isAlarm = Boolean.TRUE.equals(call.getBoolean("isAlarm", false));

        AlarmReceiver.showNotification(getContext(), id, title, body, isAlarm);
        JSObject res = new JSObject();
        res.put("success", true);
        call.resolve(res);
    }

    @PluginMethod
    public void scheduleNativeNotification(PluginCall call) {
        String id = call.getString("id");
        if (id == null || id.isEmpty()) {
            JSObject res = new JSObject();
            res.put("success", false);
            call.resolve(res);
            return;
        }
        String title = call.getString("title", "Laryko");
        String body = call.getString("body", "");
        boolean isAlarm = Boolean.TRUE.equals(call.getBoolean("isAlarm", false));
        Double triggerDouble = call.getDouble("triggerAtMs", 0.0);
        long triggerAtMs = triggerDouble != null ? triggerDouble.longValue() : 0L;
        if (triggerAtMs <= System.currentTimeMillis()) {
            triggerAtMs = System.currentTimeMillis() + 1000L;
        }

        AlarmReceiver.ensureChannels(getContext());
        AlarmManager am = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        if (am == null) {
            JSObject res = new JSObject();
            res.put("success", false);
            call.resolve(res);
            return;
        }

        Intent intent = new Intent(getContext(), AlarmReceiver.class);
        intent.putExtra(AlarmReceiver.EXTRA_ID, id);
        intent.putExtra(AlarmReceiver.EXTRA_TITLE, title);
        intent.putExtra(AlarmReceiver.EXTRA_BODY, body);
        intent.putExtra(AlarmReceiver.EXTRA_IS_ALARM, isAlarm);

        PendingIntent pi = PendingIntent.getBroadcast(
            getContext(),
            id.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (am.canScheduleExactAlarms()) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pi);
            } else {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pi);
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pi);
        } else {
            am.setExact(AlarmManager.RTC_WAKEUP, triggerAtMs, pi);
        }

        JSObject res = new JSObject();
        res.put("success", true);
        call.resolve(res);
    }

    @PluginMethod
    public void cancelNativeNotification(PluginCall call) {
        String id = call.getString("id");
        if (id == null || id.isEmpty()) {
            JSObject res = new JSObject();
            res.put("success", false);
            call.resolve(res);
            return;
        }
        AlarmManager am = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        if (am != null) {
            Intent intent = new Intent(getContext(), AlarmReceiver.class);
            PendingIntent pi = PendingIntent.getBroadcast(
                getContext(),
                id.hashCode(),
                intent,
                PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
            );
            if (pi != null) {
                am.cancel(pi);
                pi.cancel();
            }
        }
        NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.cancel(id.hashCode());
        }
        JSObject res = new JSObject();
        res.put("success", true);
        call.resolve(res);
    }

    @PluginMethod
    public void startNativeAlarm(PluginCall call) {
        double volumePercent = call.getDouble("volume", 100.0);
        float vol = (float) Math.min(1.0, Math.max(0.0, volumePercent / 100.0));

        getActivity().runOnUiThread(() -> {
            stopAlarmPlayerInternal();
            try {
                Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (alarmUri == null) alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                if (alarmUri == null) alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

                MediaPlayer mp = new MediaPlayer();
                mp.setAudioAttributes(
                    new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                );
                mp.setDataSource(getContext(), alarmUri);
                mp.setLooping(true);
                mp.setVolume(vol, vol);
                mp.prepare();
                mp.start();
                alarmPlayer = mp;

                JSObject res = new JSObject();
                res.put("success", true);
                call.resolve(res);
            } catch (Exception e) {
                JSObject res = new JSObject();
                res.put("success", false);
                call.resolve(res);
            }
        });
    }

    @PluginMethod
    public void stopNativeAlarm(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            stopAlarmPlayerInternal();
            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
        });
    }

    @PluginMethod
    public void playNativeNotificationSound(PluginCall call) {
        double volumePercent = call.getDouble("volume", 80.0);
        float vol = (float) Math.min(1.0, Math.max(0.0, volumePercent / 100.0));

        getActivity().runOnUiThread(() -> {
            if (notifyPlayer != null) {
                try {
                    notifyPlayer.stop();
                    notifyPlayer.release();
                } catch (Exception ignored) {}
                notifyPlayer = null;
            }
            try {
                Uri notifyUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                if (notifyUri == null) notifyUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);

                MediaPlayer mp = new MediaPlayer();
                mp.setAudioAttributes(
                    new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                );
                mp.setDataSource(getContext(), notifyUri);
                mp.setLooping(false);
                mp.setVolume(vol, vol);
                mp.setOnCompletionListener(player -> {
                    player.release();
                    if (notifyPlayer == player) notifyPlayer = null;
                });
                mp.prepare();
                mp.start();
                notifyPlayer = mp;

                JSObject res = new JSObject();
                res.put("success", true);
                call.resolve(res);
            } catch (Exception e) {
                JSObject res = new JSObject();
                res.put("success", false);
                call.resolve(res);
            }
        });
    }

    private void stopAlarmPlayerInternal() {
        if (alarmPlayer != null) {
            try {
                alarmPlayer.stop();
            } catch (Exception ignored) {}
            try {
                alarmPlayer.release();
            } catch (Exception ignored) {}
            alarmPlayer = null;
        }
    }
}
