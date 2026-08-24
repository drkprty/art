DRKPRTY ART — Firebase CMS
==========================

Architecture
------------
- GitHub Pages: static HTML/CSS/JS only.
- Firebase Authentication: panel login with Email/Password.
- Cloud Firestore:
  - siteContent/main: artistName, email, availableLabel, soldLabel.
  - works/{workId}: title, year, dimensions, medium, status, image, storagePath, order.
- Firebase Storage:
  - works/{workId}/... image files uploaded from the panel.

Firebase project
----------------
Project ID: drkprty-654ec

1. Open Firebase Console > Project settings > Your apps > Web app.
2. Copy the Web SDK firebaseConfig values into:
   js/firebase-config.js
3. Enable Authentication > Sign-in method > Email/Password.
4. Create the administrator account in Authentication > Users.
5. Deploy firestore.rules in Firestore > Rules.
6. Deploy storage.rules in Storage > Rules.
7. Upload this folder to the GitHub Pages repository.

Important
---------
The Firebase Web config is designed to live in frontend code. Access control is enforced by Firestore and Storage rules plus Firebase Authentication.

The public site reads Firestore without authentication. Only authenticated Firebase users can edit Firestore or upload/delete artwork images.

Local preview
-------------
Because Firebase uses ES modules, preview through a local HTTP server rather than opening index.html directly as file://.
