package com.laryko;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;

public class AlarmReceiver extends BroadcastReceiver {
    public static final String CHANNEL_ALARMS = "laryko_alarms";
    public static final String CHANNEL_REMINDERS = "laryko_reminders";
    public static final String EXTRA_ID = "id";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_BODY = "body";
    public static final String EXTRA_IS_ALARM = "isAlarm";

    @Override
    public void onReceive(Context context, Intent intent) {
        String id = intent.getStringExtra(EXTRA_ID);
        String title = intent.getStringExtra(EXTRA_TITLE);
        String body = intent.getStringExtra(EXTRA_BODY);
        boolean isAlarm = intent.getBooleanExtra(EXTRA_IS_ALARM, false);

        if (title == null || title.isEmpty()) title = "Laryko";
        if (body == null || body.isEmpty()) body = "Recordatorio programado en Laryko";

        showNotification(context, id != null ? id : String.valueOf(System.currentTimeMillis()), title, body, isAlarm);
    }

    public static void ensureChannels(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        if (nm.getNotificationChannel(CHANNEL_ALARMS) == null) {
            NotificationChannel alarmCh = new NotificationChannel(
                CHANNEL_ALARMS,
                "Alarmas Laryko",
                NotificationManager.IMPORTANCE_HIGH
            );
            alarmCh.setDescription("Alertas de alarma con sonido");
            alarmCh.enableVibration(true);
            Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alarmUri == null) alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            AudioAttributes attrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
            alarmCh.setSound(alarmUri, attrs);
            nm.createNotificationChannel(alarmCh);
        }

        if (nm.getNotificationChannel(CHANNEL_REMINDERS) == null) {
            NotificationChannel remCh = new NotificationChannel(
                CHANNEL_REMINDERS,
                "Recordatorios Laryko",
                NotificationManager.IMPORTANCE_HIGH
            );
            remCh.setDescription("Recordatorios de agenda");
            remCh.enableVibration(true);
            nm.createNotificationChannel(remCh);
        }
    }

    public static void showNotification(Context context, String id, String title, String body, boolean isAlarm) {
        ensureChannels(context);
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
            context,
            id.hashCode(),
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String channelId = isAlarm ? CHANNEL_ALARMS : CHANNEL_REMINDERS;
        Uri soundUri = RingtoneManager.getDefaultUri(
            isAlarm ? RingtoneManager.TYPE_ALARM : RingtoneManager.TYPE_NOTIFICATION
        );
        if (soundUri == null) {
            soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(isAlarm ? NotificationCompat.CATEGORY_ALARM : NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setSound(soundUri)
            .setContentIntent(contentIntent);

        nm.notify(id.hashCode(), builder.build());
    }
}
