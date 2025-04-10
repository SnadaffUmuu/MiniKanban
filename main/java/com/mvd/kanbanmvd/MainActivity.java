package com.mvd.kanbanmvd;

import androidx.appcompat.app.AppCompatActivity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.content.*;
import android.net.Uri;

public class MainActivity extends AppCompatActivity {
    private static final int REQUEST_CODE_OPEN_DOCUMENT_TREE = 42;
    private SharedPreferences prefs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        prefs = getSharedPreferences("kanban_prefs", MODE_PRIVATE);

        if (!prefs.contains("folder_uri")) {
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
            intent.putExtra("android.provider.extra.INITIAL_URI", Uri.parse("content://com.android.externalstorage.documents/document/primary:KanbanMvd"));
            startActivityForResult(intent, REQUEST_CODE_OPEN_DOCUMENT_TREE);
        }

        setupWebView();
    }

    private void setupWebView() {
        WebView webView = findViewById(R.id.webview);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.addJavascriptInterface(new WebAppInterface(this), "Android");
        webView.setWebViewClient(new WebViewClient());
        WebView.setWebContentsDebuggingEnabled(true);
        //webView.loadUrl("http://192.168.2.48:3001/index.html");
        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent resultData) {
        super.onActivityResult(requestCode, resultCode, resultData);
        if (requestCode == REQUEST_CODE_OPEN_DOCUMENT_TREE && resultCode == RESULT_OK) {
            Uri treeUri = resultData.getData();
            getContentResolver().takePersistableUriPermission(treeUri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);

            SharedPreferences prefs = getSharedPreferences("kanban_prefs", MODE_PRIVATE);
            prefs.edit().putString("folder_uri", treeUri.toString()).apply();

            setupWebView();
        }
    }
}
