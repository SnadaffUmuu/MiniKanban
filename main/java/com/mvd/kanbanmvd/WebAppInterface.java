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
    private static final String DATA_BOOKS_FILE_NAME = "kanban_mvd_books.json";
    private static final String DATA_EVENTS_FILE_NAME = "kanban_mvd_events.json";
    private Context context;

    WebAppInterface(Context ctx) {
        this.context = ctx;
    }
    
    @JavascriptInterface
    public void saveData(String data) {
    	saveDataToFile(data, DATA_FILE_NAME);
    }
    
    @JavascriptInterface
    public void saveBooks(String data) {
    	saveDataToFile(data, DATA_BOOKS_FILE_NAME);
    } 
    
    @JavascriptInterface
    public void saveEvents(String data) {
    	saveDataToFile(data, DATA_EVENTS_FILE_NAME);
    } 
    

    private void saveDataToFile(String data, String filename) {
        Log.d(TAG, "saveDataToFile called");
        Uri folderUri = getFolderUri();
        Log.d(TAG, "Got folder uri from prefs: " + folderUri);
        if (folderUri == null) return;

        DocumentFile dir = DocumentFile.fromTreeUri(context, folderUri);
        Log.d(TAG, "Search Directory res: " + dir.getUri());
        if (dir == null) return;

        DocumentFile existing = dir.findFile(filename);
        if (existing != null) {
          Log.d(TAG, "File already exists, deleting");
          existing.delete();
        }

        DocumentFile file = dir.createFile("application/json", filename);
        try (OutputStream out = context.getContentResolver().openOutputStream(file.getUri())) {
            out.write(data.getBytes());
            Log.d(TAG, "Save successful");
        } catch (IOException e) {
            Log.e(TAG, "Save failed");
            e.printStackTrace();
        }
    }
    
    @JavascriptInterface
    public String loadData() {
    	return loadDataFromFile(DATA_FILE_NAME);
    }
    
    @JavascriptInterface
    public String loadBooks() {
    	return loadDataFromFile(DATA_BOOKS_FILE_NAME);
    }   
    
    @JavascriptInterface
    public String loadEvents() {
    	return loadDataFromFile(DATA_EVENTS_FILE_NAME);
    }   

    private String loadDataFromFile(String filename) {
      Log.d(TAG, "loadDataFromFile called");
        Uri folderUri = getFolderUri();
        Log.d(TAG, "Got folder uri from prefs: " + folderUri);
        if (folderUri == null) return "null";

        DocumentFile pickedDir = DocumentFile.fromTreeUri(context, folderUri);
        Log.d(TAG, "Search Directory res: " + pickedDir.getUri());
        if (pickedDir == null) return "null";

        DocumentFile jsonFile = pickedDir.findFile(filename);
        Log.d(TAG, "Search file res: " + jsonFile.getUri());
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
