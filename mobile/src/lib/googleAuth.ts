import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin'
import { supabase } from './supabase'

// Google sign-in'i bir kez yapılandır. webClientId, Google Cloud Console'daki
// **Web** OAuth client'ından gelir ve EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID env'i
// ile build'e girer (eas.json). Android client kodda referans edilmez ama
// Google projesinde doğru SHA-1 ile var olmalıdır.
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!,
})

export type GoogleSignInResult =
  | { status: 'success' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string }

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    const response = await GoogleSignin.signIn()

    // Yeni sürümlerde iptal, throw yerine response.type === 'cancelled' döner.
    if (!isSuccessResponse(response)) {
      return { status: 'cancelled' }
    }

    const idToken = response.data.idToken
    if (!idToken) {
      return { status: 'error', message: 'Google kimlik doğrulaması başarısız (token alınamadı).' }
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    })
    if (error) {
      return { status: 'error', message: error.message }
    }

    // Başarı: supabase.auth.onAuthStateChange (AuthProvider) yönlendirmeyi yapar.
    return { status: 'success' }
  } catch (error) {
    // Eski sürüm davranışı: iptal/hatalar throw edilebilir.
    if (isErrorWithCode(error)) {
      switch (error.code) {
        case statusCodes.SIGN_IN_CANCELLED:
        case statusCodes.IN_PROGRESS:
          return { status: 'cancelled' }
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          return { status: 'error', message: 'Google Play Services yüklü değil veya güncel değil.' }
        default:
          return { status: 'error', message: error.message ?? 'Google ile giriş başarısız.' }
      }
    }
    return { status: 'error', message: 'Beklenmeyen bir hata oluştu.' }
  }
}
