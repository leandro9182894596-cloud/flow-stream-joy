# Android Studio Wrapper

Projeto Android nativo para abrir o `FLOW TV` em uma `WebView` e gerar APK pelo Android Studio.

## Antes de abrir no Android Studio

1. Edite `app/src/main/res/values/strings.xml`
2. Troque `https://SEU-DOMINIO-AQUI.com` pela URL publicada do seu app

Exemplo:

```xml
<string name="remote_app_url">https://meuapp.com</string>
```

## Como abrir

1. Abra o Android Studio
2. Clique em `Open`
3. Selecione a pasta `android-wrapper`
4. Aguarde o Gradle Sync

## Como gerar APK

1. No Android Studio, abra `Build`
2. Clique em `Build Bundle(s) / APK(s)`
3. Clique em `Build APK(s)`

## Observacoes

- Esse wrapper depende de uma URL online funcionando
- Como o projeto original usa funcoes de servidor, ele nao roda inteiro dentro de um APK offline
- Se quiser testar servidor local no emulador Android, use algo como `http://10.0.2.2:3000`
