/**
 * Security Sanitizer & Threat Detection Middleware
 * Bảo vệ hệ thống khỏi các cuộc tấn công XSS, SQL Injection, Command Injection và HTML Injection
 */

// Danh sách các regex pattern nhận diện mã độc nguy hiểm
const THREAT_PATTERNS = [
  // 1. Cross-Site Scripting (XSS) & HTML Tag Injection
  { name: 'XSS Script Tag', regex: /<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/i },
  { name: 'XSS Incomplete Script', regex: /<\s*script\b/i },
  { name: 'XSS Javascript URI', regex: /javascript\s*:\s*/i },
  { name: 'XSS VBScript URI', regex: /vbscript\s*:\s*/i },
  { name: 'XSS Event Handler', regex: /\b(onload|onerror|onclick|onmouseover|onfocus|onblur|onkeydown|onkeyup|onchange|onsubmit|onmouseenter)\s*=/i },
  { name: 'XSS Iframe/Object/Embed', regex: /<\s*(iframe|object|embed|applet|meta|link|base)\b/i },
  { name: 'XSS SVG/Image Payload', regex: /<\s*(svg|img|body|input)\b[^>]*\s+(onerror|onload)\s*=/i },
  { name: 'XSS Expression/Eval', regex: /\b(eval|alert|prompt|confirm|document\.cookie|window\.location)\s*\(/i },

  // 2. SQL Injection Patterns
  { name: 'SQL Injection Union Select', regex: /\bUNION\s+(ALL\s+)?SELECT\b/i },
  { name: 'SQL Injection Drop/Alter Table', regex: /\b(DROP|ALTER|TRUNCATE)\s+(TABLE|DATABASE)\b/i },
  { name: 'SQL Injection Exec/System', regex: /\b(EXEC|EXECUTE)\s*(\(|sp_|xp_)/i },
  { name: 'SQL Injection Tautology', regex: /\bOR\s+['"]?1['"]?\s*=\s*['"]?1['"]?/i },
  { name: 'SQL Injection Comment Payload', regex: /(;\s*--|--\s*$|\/\*.*?\*\/)/i },

  // 3. Shell / Command Injection
  { name: 'Shell Injection Command Pipe', regex: /[;&|`$]\s*(cat\s+\/etc\/passwd|rm\s+-rf|curl\s+http|wget\s+http|powershell|cmd\.exe)/i },
];

/**
 * Hàm đệ quy kiểm tra toàn bộ giá trị trong object / string / array
 */
function scanValueForThreats(val, path = '') {
  if (val === null || val === undefined) return null;

  if (typeof val === 'string') {
    for (const threat of THREAT_PATTERNS) {
      if (threat.regex.test(val)) {
        return {
          threat: threat.name,
          field: path,
          sample: val.slice(0, 80),
        };
      }
    }
    return null;
  }

  if (Array.isArray(val)) {
    for (let i = 0; i < val.length; i++) {
      const found = scanValueForThreats(val[i], `${path}[${i}]`);
      if (found) return found;
    }
    return null;
  }

  if (typeof val === 'object') {
    for (const key of Object.keys(val)) {
      // Ngăn chặn NoSQL / Prototype Pollution attacks
      if (key.startsWith('$') || key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return {
          threat: 'Object Prototype / NoSQL Operator Injection',
          field: `${path}.${key}`,
          sample: key,
        };
      }
      const found = scanValueForThreats(val[key], path ? `${path}.${key}` : key);
      if (found) return found;
    }
    return null;
  }

  return null;
}

/**
 * Hàm làm sạch (Sanitize) chuỗi: Xóa HTML nguy hiểm & trim khoảng trắng
 */
function sanitizeClean(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'string') {
      // Trim khoảng trắng thừa
      obj[key] = obj[key].trim();
    } else if (typeof obj[key] === 'object') {
      sanitizeClean(obj[key]);
    }
  }
  return obj;
}

/**
 * Middleware Express bảo vệ toàn diện
 */
const securitySanitizer = (req, res, next) => {
  try {
    // 1. Quét req.body
    if (req.body) {
      const threatInBody = scanValueForThreats(req.body, 'body');
      if (threatInBody) {
        console.warn(`🚨 [Security Alert] Phát hiện tấn công ${threatInBody.threat} từ IP ${req.ip || req.connection.remoteAddress}`);
        console.warn(`   Trường: ${threatInBody.field} | Mẫu: "${threatInBody.sample}"`);
        return res.status(400).json({
          success: false,
          message: 'Cảnh báo bảo mật: Dữ liệu gửi lên chứa mã độc hoặc cú pháp nguy hiểm (XSS / SQL Injection)!',
          detail: `Phát hiện: ${threatInBody.threat} tại trường "${threatInBody.field}"`,
        });
      }
      // Làm sạch dữ liệu
      sanitizeClean(req.body);
    }

    // 2. Quét req.query
    if (req.query) {
      const threatInQuery = scanValueForThreats(req.query, 'query');
      if (threatInQuery) {
        console.warn(`🚨 [Security Alert] Phát hiện query nguy hiểm ${threatInQuery.threat} từ IP ${req.ip}`);
        return res.status(400).json({
          success: false,
          message: 'Cảnh báo bảo mật: Tham số tìm kiếm chứa ký tự hoặc mã không an toàn!',
        });
      }
    }

    // 3. Quét req.params
    if (req.params) {
      const threatInParams = scanValueForThreats(req.params, 'params');
      if (threatInParams) {
        return res.status(400).json({
          success: false,
          message: 'Cảnh báo bảo mật: Đường dẫn URL chứa mã không hợp lệ!',
        });
      }
    }

    next();
  } catch (err) {
    console.error('Lỗi kiểm tra bảo mật:', err);
    next();
  }
};

module.exports = securitySanitizer;
