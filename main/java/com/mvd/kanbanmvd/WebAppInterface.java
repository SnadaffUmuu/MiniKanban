package com.mvd.kanbanmvd;
import android.content.*;
import android.net.Uri;
import android.webkit.JavascriptInterface;
import androidx.documentfile.provider.DocumentFile;
import android.util.Log;

import java.io.*;

public class WebAppInterface {
    private static final String TAG = "KanbanMvdLog";
    private static final String DATA_FILE_NAME = "kanban_mvd_data.json";
    private Context context;

    WebAppInterface(Context ctx) {
        this.context = ctx;
    }

    @JavascriptInterface
    public void saveDataToFile(String data) {
        Log.d(TAG, "saveDataToFile called");
        Uri folderUri = getFolderUri();
        Log.d(TAG, "Got folder uri from prefs: " + folderUri);
        if (folderUri == null) return;

        DocumentFile dir = DocumentFile.fromTreeUri(context, folderUri);
        Log.d(TAG, "Search Directory res: " + dir);
        if (dir == null) return;

        DocumentFile existing = dir.findFile(DATA_FILE_NAME);
        if (existing != null) {
          Log.d(TAG, "File already exists, deleting");
          existing.delete();
        }

        DocumentFile file = dir.createFile("application/json", DATA_FILE_NAME);
        try (OutputStream out = context.getContentResolver().openOutputStream(file.getUri())) {
            out.write(data.getBytes());
            Log.d(TAG, "Save successful");
        } catch (IOException e) {
            Log.e(TAG, "Save failed");
            e.printStackTrace();
        }
    }

    @JavascriptInterface
    public String loadDataFromFile() {
      Log.d(TAG, "loadDataFromFile called");
        Uri folderUri = getFolderUri();
        Log.d(TAG, "Got folder uri from prefs: " + folderUri);
        if (folderUri == null) return "null";

        DocumentFile pickedDir = DocumentFile.fromTreeUri(context, folderUri);
        Log.d(TAG, "Search Directory res: " + pickedDir);
        if (pickedDir == null) return "null";

        DocumentFile jsonFile = pickedDir.findFile(DATA_FILE_NAME);
        Log.d(TAG, "Search file res: " + jsonFile);
        if (jsonFile == null) return "null";

        try {
            InputStream in = context.getContentResolver().openInputStream(jsonFile.getUri());
            BufferedReader reader = new BufferedReader(new InputStreamReader(in));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            in.close();
            Log.d(TAG, "Load successful, data length: " + sb.toString());
            return sb.toString();
        } catch (IOException e) {
            Log.e(TAG, "Load failed", e);
            e.printStackTrace();
            return "null";
        }
    }

    private Uri getFolderUri() {
        SharedPreferences prefs = context.getSharedPreferences("kanban_prefs", Context.MODE_PRIVATE);
        String uriString = prefs.getString("folder_uri", null);
        return uriString != null ? Uri.parse(uriString) : null;
    }
}
