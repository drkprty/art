DRKPRTY ART — Firebase build v11

Firebase project: drkprtyart

Architecture
- GitHub Pages: static HTML/CSS/JS
- Firebase Authentication: panel login (Email/Password)
- Cloud Firestore: site text + artwork metadata
- Firebase Storage: artwork images

Important Firebase setup
1. Authentication > Sign-in method: Email/Password enabled.
2. Authentication > Users: create the admin user.
3. Firestore Database: create/enable the database.
4. Storage: create/enable the bucket.
5. Publish firestore.rules in Firestore > Rules.
6. Publish storage.rules in Storage > Rules.
7. Authentication > Settings > Authorized domains: add the production domain / GitHub Pages hostname if needed.

Public website reads:
- siteContent/main
- works/* ordered by the `order` field

Panel path:
/panel/

The panel creates siteContent/main and works documents when Save changes is used. Artwork files are uploaded under works/<work-id>/ in Firebase Storage.
