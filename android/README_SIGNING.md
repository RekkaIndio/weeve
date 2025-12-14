Signing and releasing (quick)

1. Create a keystore (interactively):

```bash
keytool -genkeypair -v -keystore ~/keystores/my-upload-key.jks -alias upload -keyalg RSA -keysize 2048 -validity 36500
```

2. Or create non-interactively (not recommended on shared machines):

```bash
keytool -genkeypair -v -keystore ~/keystores/my-upload-key.jks -storepass "YOUR_STORE_PASS" -alias upload -keypass "YOUR_KEY_PASS" -keyalg RSA -keysize 2048 -validity 36500 -dname "CN=Name, OU=Unit, O=Org, L=City, ST=State, C=CC"
```

3. Create `android/keystore.properties` (copy from `android/keystore.properties.example`) and fill in values:

```
storeFile=/Users/you/keystores/my-upload-key.jks
storePassword=yourpassword
keyAlias=upload
keyPassword=yourpassword
```

4. Build a signed AAB locally:

```bash
cd android
./gradlew bundleRelease
```

4b. Build a signed Staging AAB (different package name / avoids Play conflicts):

```bash
cd android
./gradlew bundleStaging
```

The staging bundle will be placed at `android/app/build/outputs/bundle/staging/app-staging.aab`.

5. CI recommendations:
- Do NOT check `android/keystore.properties` into git.
- Use encrypted secrets in your CI provider (GitHub Actions secrets, GitLab CI variables, etc.).
- You can store the keystore binary in a secure artifact store or encode it in a secret and decode it at build time.

6. Google Play:
- Use Android App Signing (recommended). Upload the AAB signed with your upload key and Play will re-sign for distribution.
- If you lose an upload key and are enrolled in Play App Signing, request an upload key reset with Google Play support.

7. Keep backups of the keystore and passwords in a secure password manager and offline backup.
