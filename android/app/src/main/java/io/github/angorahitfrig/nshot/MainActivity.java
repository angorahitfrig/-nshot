package io.github.angorahitfrig.nshot;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Hosts the nShot web app (bundled in assets/www) in a WebView and supplies the pieces a
 * browser page cannot do on Android: picking photos, saving to the gallery, sharing to
 * Instagram & co., and receiving photos shared from other apps.
 */
public class MainActivity extends Activity {

    /** Pages are served from a virtual https origin so canvas/blob APIs behave as on the web. */
    static final String HOST = "appassets.androidplatform.net";
    static final String BASE = "https://" + HOST + "/";

    private static final int REQ_PICK = 1;
    private static final int REQ_STORAGE = 2;

    private final Handler ui = new Handler(Looper.getMainLooper());
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private boolean pageReady;

    // A photo shared to the app ("Share → nShot"), served to the page under /shared/<n>.
    private volatile Uri sharedUri;
    private int sharedSeq;
    private boolean sharedPending;

    // Save waiting for the storage permission (Android 9 and older only).
    private byte[] pendingData;
    private String pendingMime;
    private String pendingName;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        web = new WebView(this);
        web.setBackgroundColor(0xFF1B1B1B);
        web.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);

        web.addJavascriptInterface(new Bridge(), "NShotAndroid");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                return serve(req.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (HOST.equals(u.getHost())) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, u));
                } catch (ActivityNotFoundException ignored) {
                    // nothing to open it with
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                pageReady = true;
                deliverShared();
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = cb;
                if (!startPicker()) {
                    fileCallback = null;
                    cb.onReceiveValue(null);
                    toast("Galeri açılamadı");
                }
                return true;
            }
        });

        handleIntent(getIntent());
        web.loadUrl(BASE + "www/index.html");
    }

    /* ------------------------------------------------------------------ */
    /* Local "web server"                                                  */
    /* ------------------------------------------------------------------ */

    private WebResourceResponse serve(Uri u) {
        if (!HOST.equals(u.getHost())) return null;
        String path = u.getPath() == null ? "/" : u.getPath();
        try {
            if (path.startsWith("/shared/")) {
                Uri src = sharedUri;
                if (src == null) return notFound();
                String type = getContentResolver().getType(src);
                InputStream in = getContentResolver().openInputStream(src);
                if (in == null) return notFound();
                return ok(type != null ? type : "image/jpeg", in);
            }
            if (path.startsWith("/www/") && !path.contains("..")) {
                String asset = path.substring(1);
                return ok(mimeOf(asset), getAssets().open(asset));
            }
        } catch (IOException | SecurityException ignored) {
            // fall through
        }
        return notFound();
    }

    private static WebResourceResponse ok(String mime, InputStream in) {
        boolean text = mime.startsWith("text/") || mime.contains("javascript") || mime.contains("json") || mime.contains("svg");
        WebResourceResponse r = new WebResourceResponse(mime, text ? "utf-8" : null, in);
        Map<String, String> h = new HashMap<>();
        h.put("Cache-Control", "no-cache");
        r.setResponseHeaders(h);
        return r;
    }

    private static WebResourceResponse notFound() {
        return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found",
                new HashMap<>(), new ByteArrayInputStream(new byte[0]));
    }

    private static String mimeOf(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".json") || p.endsWith(".webmanifest")) return "application/json";
        return "application/octet-stream";
    }

    /* ------------------------------------------------------------------ */
    /* Photo picker                                                        */
    /* ------------------------------------------------------------------ */

    private boolean startPicker() {
        if (Build.VERSION.SDK_INT >= 33) {
            Intent i = new Intent(MediaStore.ACTION_PICK_IMAGES);
            i.setType("image/*");
            try {
                startActivityForResult(i, REQ_PICK);
                return true;
            } catch (ActivityNotFoundException ignored) {
                // fall back to the document picker below
            }
        }
        Intent i = new Intent(Intent.ACTION_GET_CONTENT);
        i.addCategory(Intent.CATEGORY_OPENABLE);
        i.setType("image/*");
        try {
            startActivityForResult(Intent.createChooser(i, "Fotoğraf seç"), REQ_PICK);
            return true;
        } catch (ActivityNotFoundException e) {
            return false;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQ_PICK || fileCallback == null) return;
        Uri[] result = null;
        if (resultCode == RESULT_OK && data != null) {
            if (data.getData() != null) {
                result = new Uri[]{data.getData()};
            } else if (data.getClipData() != null && data.getClipData().getItemCount() > 0) {
                result = new Uri[]{data.getClipData().getItemAt(0).getUri()};
            }
        }
        fileCallback.onReceiveValue(result);
        fileCallback = null;
    }

    /* ------------------------------------------------------------------ */
    /* Photos shared to the app                                            */
    /* ------------------------------------------------------------------ */

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
        deliverShared();
    }

    @SuppressWarnings("deprecation")
    private void handleIntent(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return;
        Uri u = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        if (u == null && intent.getClipData() != null && intent.getClipData().getItemCount() > 0) {
            u = intent.getClipData().getItemAt(0).getUri();
        }
        if (u == null) return;
        sharedUri = u;
        sharedSeq++;
        sharedPending = true;
    }

    private void deliverShared() {
        if (!sharedPending || !pageReady) return;
        sharedPending = false;
        web.evaluateJavascript(
                "window.nshotOpenUrl && window.nshotOpenUrl('" + BASE + "shared/" + sharedSeq + "')", null);
    }

    /* ------------------------------------------------------------------ */
    /* Saving & sharing                                                    */
    /* ------------------------------------------------------------------ */

    private static String safeName(String name) {
        String n = name == null ? "" : name.replaceAll("[^A-Za-z0-9._-]", "_");
        return n.isEmpty() ? "nshot.jpg" : n;
    }

    private void saveToGallery(byte[] data, String mime, String name) {
        try {
            if (Build.VERSION.SDK_INT >= 29) {
                ContentResolver cr = getContentResolver();
                ContentValues v = new ContentValues();
                v.put(MediaStore.Images.Media.DISPLAY_NAME, name);
                v.put(MediaStore.Images.Media.MIME_TYPE, mime);
                v.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/nShot");
                v.put(MediaStore.Images.Media.IS_PENDING, 1);
                Uri uri = cr.insert(MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY), v);
                if (uri == null) throw new IOException("insert failed");
                try (OutputStream out = cr.openOutputStream(uri)) {
                    if (out == null) throw new IOException("no stream");
                    out.write(data);
                }
                v.clear();
                v.put(MediaStore.Images.Media.IS_PENDING, 0);
                cr.update(uri, v, null, null);
            } else {
                File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "nShot");
                if (!dir.isDirectory() && !dir.mkdirs()) throw new IOException("mkdirs failed");
                File f = new File(dir, name);
                try (OutputStream out = new FileOutputStream(f)) {
                    out.write(data);
                }
                MediaScannerConnection.scanFile(this, new String[]{f.getAbsolutePath()}, new String[]{mime}, null);
            }
            toast("Galeriye kaydedildi (Resimler/nShot)");
        } catch (Exception e) {
            toast("Kaydedilemedi");
        }
    }

    private void share(byte[] data, String mime, String name) {
        try {
            File dir = new File(getCacheDir(), ShareProvider.DIR);
            if (!dir.isDirectory() && !dir.mkdirs()) throw new IOException("mkdirs failed");
            File[] old = dir.listFiles();
            if (old != null) for (File f : old) //noinspection ResultOfMethodCallIgnored
                f.delete();
            File f = new File(dir, name);
            try (OutputStream out = new FileOutputStream(f)) {
                out.write(data);
            }
            Uri uri = Uri.parse("content://" + ShareProvider.AUTHORITY + "/" + Uri.encode(name));
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType(mime);
            send.putExtra(Intent.EXTRA_STREAM, uri);
            send.setClipData(ClipData.newRawUri(name, uri));
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            ui.post(() -> startActivity(Intent.createChooser(send, "Paylaş")));
        } catch (Exception e) {
            toast("Paylaşılamadı");
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode != REQ_STORAGE || pendingData == null) return;
        final byte[] d = pendingData;
        final String m = pendingMime, n = pendingName;
        pendingData = null;
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) {
            new Thread(() -> saveToGallery(d, m, n)).start();
        } else {
            toast("Kaydetmek için depolama izni gerekli");
        }
    }

    /** Called from app.js as window.NShotAndroid.* (runs on a background thread). */
    private class Bridge {
        @JavascriptInterface
        public void saveImage(String base64, String mime, String name) {
            byte[] data = Base64.decode(base64, Base64.DEFAULT);
            String n = safeName(name);
            if (Build.VERSION.SDK_INT < 29
                    && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                ui.post(() -> {
                    pendingData = data;
                    pendingMime = mime;
                    pendingName = n;
                    requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, REQ_STORAGE);
                });
                return;
            }
            saveToGallery(data, mime, n);
        }

        @JavascriptInterface
        public void shareImage(String base64, String mime, String name) {
            share(Base64.decode(base64, Base64.DEFAULT), mime, safeName(name));
        }
    }

    /* ------------------------------------------------------------------ */
    /* Lifecycle                                                           */
    /* ------------------------------------------------------------------ */

    private void toast(String msg) {
        ui.post(() -> Toast.makeText(this, msg, Toast.LENGTH_SHORT).show());
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        web.evaluateJavascript("window.nshotBack ? window.nshotBack() : false", v -> {
            if (!"true".equals(v)) finish();
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onPause() {
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        web.destroy();
        super.onDestroy();
    }
}
