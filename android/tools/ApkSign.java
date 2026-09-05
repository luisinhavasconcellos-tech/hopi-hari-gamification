import com.android.apksig.ApkSigner;
import com.android.apksig.ApkVerifier;

import java.io.File;
import java.io.FileInputStream;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Assina um APK (esquema v2) com a biblioteca apksig (a mesma do apksigner
 * do Android SDK) e verifica o resultado. Também alinha as entradas
 * não comprimidas (equivalente ao zipalign), exigido para targetSdk >= 30.
 *
 * uso: java -cp apksig.jar:. ApkSign <in.apk> <out.apk> <keystore.p12> <senha> <alias> <minSdk>
 */
public class ApkSign {
    public static void main(String[] args) throws Exception {
        if (args.length < 6) {
            System.err.println("uso: ApkSign <in.apk> <out.apk> <keystore> <senha> <alias> <minSdk>");
            System.exit(2);
        }
        File in = new File(args[0]);
        File out = new File(args[1]);
        char[] pass = args[3].toCharArray();
        int minSdk = Integer.parseInt(args[5]);

        KeyStore ks = KeyStore.getInstance("PKCS12");
        try (FileInputStream fis = new FileInputStream(args[2])) {
            ks.load(fis, pass);
        }
        PrivateKey key = (PrivateKey) ks.getKey(args[4], pass);
        Certificate[] chain = ks.getCertificateChain(args[4]);
        List<X509Certificate> certs = new ArrayList<>();
        for (Certificate c : chain) certs.add((X509Certificate) c);

        ApkSigner.SignerConfig signer = new ApkSigner.SignerConfig.Builder("giralata", key, certs).build();
        new ApkSigner.Builder(Collections.singletonList(signer))
                .setInputApk(in)
                .setOutputApk(out)
                .setMinSdkVersion(minSdk)
                .setV1SigningEnabled(false) // o assinador v1 do apksig 2.3.0 depende de APIs internas removidas do JDK 21; v2 basta para minSdk 26
                .setV2SigningEnabled(true)
                .build()
                .sign();

        ApkVerifier.Result result = new ApkVerifier.Builder(out).setMinCheckedPlatformVersion(minSdk).build().verify();
        System.out.println("verified=" + result.isVerified()
                + " v1=" + result.isVerifiedUsingV1Scheme()
                + " v2=" + result.isVerifiedUsingV2Scheme());
        for (ApkVerifier.IssueWithParams e : result.getErrors()) System.out.println("ERROR: " + e);
        for (ApkVerifier.IssueWithParams w : result.getWarnings()) System.out.println("WARN: " + w);
        if (!result.isVerified()) System.exit(1);
    }
}
