/**
 * Authentication and login detection utilities
 * Provides robust detection of login/auth pages and flows across different websites
 */

export interface AuthDetectionResult {
  isAuthStep: boolean;
  authType: 'login' | 'signup' | 'oauth' | 'terms' | 'verification' | 'password_reset' | 'mfa' | 'unknown';
  confidence: number; // 0-1 score
  reasons: string[];
}

export interface SessionAction {
  type: string;
  url: string;
  selector?: string;
  value?: string;
  step: number;
  metadata?: any;
}

/**
 * Detects if a URL is likely an authentication/login related page
 */
export function isAuthUrl(url: string): AuthDetectionResult {
  const normalizedUrl = url.toLowerCase();
  let confidence = 0;
  const reasons: string[] = [];
  let authType: AuthDetectionResult['authType'] = 'unknown';

  // Authentication domain patterns
  const authDomains = [
    'auth.',
    'login.',
    'signin.',
    'signup.',
    'sso.',
    'oauth.',
    'identity.',
    'accounts.',
    'b2clogin.',
    'b2c.',
    'adfs.',
    'okta.',
    'saml.',
    'openid.',
    'sts.',
    'federation.',
    'idp.',
    'myid.',
    'govpass',
    'mygovid',
    // PowerApps and Microsoft-specific patterns
    'powerappsportals.com',
    'microsoftonline.com',
    'dynamics.com',
    '.crm',
    'powerplatform.',
    'azure.'
  ];

  // Check for auth domains
  for (const domain of authDomains) {
    if (normalizedUrl.includes(domain)) {
      confidence += 0.8;
      reasons.push(`Authentication domain detected: ${domain}`);
      authType = 'oauth';
      break;
    }
  }

  // Authentication path patterns
  const authPaths = [
    '/auth/',
    '/login',
    '/signin',
    '/signup',
    '/register',
    '/oauth',
    '/sso',
    '/saml',
    '/openid',
    '/account/login',
    '/account/signin',
    '/account/register',
    '/users/sign_in',
    '/users/sign_up',
    '/session/new',
    '/authenticate',
    '/authorization',
    '/authorize',
    '/connect/authorize',
    '/identity',
    '/federation',
    '/terms',
    '/privacy',
    '/consent',
    '/verification',
    '/verify',
    '/mfa',
    '/2fa',
    '/reset',
    '/forgot',
    '/recover'
  ];

  for (const path of authPaths) {
    if (normalizedUrl.includes(path)) {
      confidence += 0.7;
      reasons.push(`Authentication path detected: ${path}`);
      
      // Set more specific auth types based on path
      if (path.includes('signup') || path.includes('register')) {
        authType = 'signup';
      } else if (path.includes('terms') || path.includes('privacy') || path.includes('consent')) {
        authType = 'terms';
      } else if (path.includes('verify') || path.includes('verification')) {
        authType = 'verification';
      } else if (path.includes('reset') || path.includes('forgot') || path.includes('recover')) {
        authType = 'password_reset';
      } else if (path.includes('mfa') || path.includes('2fa')) {
        authType = 'mfa';
      } else if (path.includes('oauth') || path.includes('authorize') || path.includes('connect')) {
        authType = 'oauth';
      } else {
        authType = 'login';
      }
      break;
    }
  }

  // OAuth/OpenID query parameters
  const oauthParams = [
    'client_id=',
    'response_type=',
    'redirect_uri=',
    'scope=',
    'state=',
    'nonce=',
    'code_challenge=',
    'code_challenge_method=',
    'prompt=login',
    'response_mode='
  ];

  for (const param of oauthParams) {
    if (normalizedUrl.includes(param)) {
      confidence += 0.6;
      reasons.push(`OAuth parameter detected: ${param.replace('=', '')}`);
      authType = 'oauth';
    }
  }

  // Authentication-related query strings
  const authQueries = [
    'signin',
    'login',
    'auth',
    'sso',
    'external',
    'provider',
    'returnurl',
    'continue=',
    'next=',
    'redirect='
  ];

  for (const query of authQueries) {
    if (normalizedUrl.includes(query)) {
      confidence += 0.4;
      reasons.push(`Authentication query detected: ${query}`);
    }
  }

  // Terms and conditions patterns
  const termsPatterns = [
    'termsandconditions',
    'terms-and-conditions',
    'terms_and_conditions',
    'useexternalsigninasync=true',
    'agreement',
    'accept',
    'consent'
  ];

  for (const pattern of termsPatterns) {
    if (normalizedUrl.includes(pattern)) {
      confidence += 0.7;
      reasons.push(`Terms/consent pattern detected: ${pattern}`);
      authType = 'terms';
    }
  }

  // Cap confidence at 1.0
  confidence = Math.min(confidence, 1.0);

  return {
    isAuthStep: confidence > 0.5,
    authType,
    confidence,
    reasons
  };
}

/**
 * Detects if an action is authentication-related based on selectors and values
 */
export function isAuthAction(action: SessionAction): AuthDetectionResult {
  let confidence = 0;
  const reasons: string[] = [];
  let authType: AuthDetectionResult['authType'] = 'unknown';

  // Check URL first
  const urlResult = isAuthUrl(action.url);
  if (urlResult.isAuthStep) {
    confidence += urlResult.confidence * 0.7; // Weight URL detection
    reasons.push(...urlResult.reasons.map(r => `URL: ${r}`));
    authType = urlResult.authType;
  }

  if (action.selector) {
    const selector = action.selector.toLowerCase();
    
    // Login/signin selectors
    const loginSelectors = [
      'login',
      'signin',
      'sign-in',
      'sign_in',
      'auth',
      'submit',
      'email',
      'username',
      'password',
      'credential'
    ];

    for (const pattern of loginSelectors) {
      if (selector.includes(pattern)) {
        confidence += 0.6;
        reasons.push(`Login selector pattern: ${pattern}`);
        if (authType === 'unknown') authType = 'login';
      }
    }

    // Terms/agreement selectors
    const termsSelectors = [
      'terms',
      'agreement',
      'consent',
      'accept',
      'confirm',
      'checkbox'
    ];

    for (const pattern of termsSelectors) {
      if (selector.includes(pattern)) {
        confidence += 0.5;
        reasons.push(`Terms selector pattern: ${pattern}`);
        authType = 'terms';
      }
    }
  }

  if (action.value) {
    const value = action.value.toLowerCase();
    
    // Authentication action values
    const authValues = [
      'sign in',
      'sign up',
      'log in',
      'login',
      'signin',
      'authenticate',
      'submit',
      'continue',
      'accept',
      'agree',
      'i agree',
      'get code',
      'verify',
      'send code',
      'next',
      'proceed'
    ];

    for (const pattern of authValues) {
      if (value.includes(pattern)) {
        confidence += 0.7;
        reasons.push(`Auth action value: ${pattern}`);
        
        if (pattern.includes('agree') || pattern.includes('accept')) {
          authType = 'terms';
        } else if (pattern.includes('code') || pattern.includes('verify')) {
          authType = 'verification';
        } else if (authType === 'unknown') {
          authType = 'login';
        }
      }
    }

    // Email patterns (common in login forms)
    const emailPattern = /[\w\.-]+@[\w\.-]+\.\w+/;
    if (emailPattern.test(value)) {
      confidence += 0.8;
      reasons.push('Email address input detected');
      if (authType === 'unknown') authType = 'login';
    }
  }

  // Cap confidence at 1.0
  confidence = Math.min(confidence, 1.0);

  return {
    isAuthStep: confidence > 0.4,
    authType,
    confidence,
    reasons
  };
}

/**
 * Analyzes a session to identify which steps are authentication-related
 */
export function identifyAuthSteps(actions: SessionAction[]): number[] {
  const authSteps: number[] = [];
  let inAuthFlow = false;
  let originalDomain = '';
  
  // Get the original domain to detect when we return to main app
  if (actions.length > 0) {
    try {
      originalDomain = new URL(actions[0].url).hostname;
    } catch (e) {
      console.warn('Could not parse original URL:', actions[0].url);
    }
  }

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const authResult = isAuthAction(action);
    
    // Mark step as auth if it meets confidence threshold
    if (authResult.isAuthStep) {
      authSteps.push(action.step);
      inAuthFlow = true;
      console.log(`🔐 Auth step ${action.step} detected: ${authResult.authType} (confidence: ${authResult.confidence.toFixed(2)})`);
      console.log(`   Reasons: ${authResult.reasons.join(', ')}`);
    }
    
    // Continue marking steps as auth if we're in an auth flow and haven't returned to main domain
    else if (inAuthFlow) {
      try {
        const currentDomain = new URL(action.url).hostname;
        
        // If we're back to the original domain and it's not an auth-looking URL, end auth flow
        if (currentDomain === originalDomain && !isAuthUrl(action.url).isAuthStep) {
          console.log(`🏠 Returned to main app at step ${action.step}, ending auth flow`);
          inAuthFlow = false;
        } else {
          // Still in auth flow
          authSteps.push(action.step);
          console.log(`🔐 Auth flow continuation step ${action.step}`);
        }
      } catch (e) {
        // If URL parsing fails, assume we're still in auth flow
        authSteps.push(action.step);
      }
    }
  }

  console.log(`🔐 Total auth steps identified: ${authSteps.length} of ${actions.length}`);
  return authSteps;
}
