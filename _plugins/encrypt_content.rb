# frozen_string_literal: true

require "openssl"
require "base64"
require "securerandom"
require "json"

module Jekyll
  module EncryptContent
    ITERATIONS = 210_000
    KEY_LENGTH = 32
    SALT_LENGTH = 16
    IV_LENGTH = 12

    module_function

    def site_config(site)
      site.config.fetch("encrypt_content", {})
    rescue StandardError
      {}
    end

    def password_for(doc)
      env_key = doc.data["encrypt_password_env"]
      password = ENV[env_key] if env_key && !env_key.to_s.strip.empty?
      if (password.nil? || password.empty?) && doc.data.key?("encrypt_password")
        password = doc.data["encrypt_password"]
      end
      password&.to_s&.strip
    end

    def encrypt(html, password, iterations)
      salt = SecureRandom.random_bytes(SALT_LENGTH)
      iv = SecureRandom.random_bytes(IV_LENGTH)
      key = OpenSSL::PKCS5.pbkdf2_hmac(password, salt, iterations, KEY_LENGTH, "sha256")
      cipher = OpenSSL::Cipher.new("aes-256-gcm")
      cipher.encrypt
      cipher.key = key
      cipher.iv = iv
      cipher.auth_data = ""
      ciphertext = cipher.update(html) + cipher.final
      tag = cipher.auth_tag
      [salt, iv, ciphertext + tag]
    end

    def placeholders(doc)
      cfg = site_config(doc.site)
      {
        message: cfg["message"] || "此内容已加密，需要输入密码才能查看。",
        prompt: cfg["prompt"] || "请输入密码解锁本篇文章：",
        error: cfg["error"] || "密码错误，请重试。",
        button: cfg["button"] || "解锁",
        loading: cfg["loading"] || "解锁中…"
      }
    end

    def iterations(doc)
      cfg = site_config(doc.site)
      value = cfg["iterations"] || ITERATIONS
      value = value.to_i
      value.positive? ? value : ITERATIONS
    end

    def build_output(doc, salt, iv, payload, iterations, placeholders)
      salt64 = Base64.strict_encode64(salt)
      iv64 = Base64.strict_encode64(iv)
      payload64 = Base64.strict_encode64(payload)
      message = doc.data["encrypt_message"] || placeholders[:message]
      label = doc.data["encrypt_prompt"] || placeholders[:prompt]
      error = doc.data["encrypt_error"] || placeholders[:error]
      button = doc.data["encrypt_button"] || placeholders[:button]
      loading = doc.data["encrypt_loading"] || placeholders[:loading]

      <<~HTML
        <div class="encrypted-content-wrapper" data-salt="#{salt64}" data-iv="#{iv64}" data-payload="#{payload64}" data-iterations="#{iterations}">
          <noscript>#{message}（需启用 JavaScript）</noscript>
        </div>
        <script>
          (function() {
            const wrapper = document.currentScript.previousElementSibling;
            if (!wrapper || !wrapper.dataset) { return; }

            const iterations = parseInt(wrapper.dataset.iterations, 10);
            const placeholderMessage = #{message.to_json};
            const promptLabel = #{label.to_json};
            const errorMessage = #{error.to_json};
            const buttonText = #{button.to_json};
            const loadingText = #{loading.to_json};

            function base64ToBytes(str) {
              const binary = window.atob(str);
              const len = binary.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = binary.charCodeAt(i);
              }
              return bytes;
            }

            function renderForm() {
              const form = document.createElement('form');
              form.className = 'encrypted-content-form';
              form.innerHTML = `
                <p class="encrypted-message">${placeholderMessage}</p>
                <label class="encrypted-label">${promptLabel}</label>
                <div class="encrypted-input-row">
                  <input type="password" required autocomplete="current-password" class="encrypted-input" />
                  <button type="submit" class="encrypted-button">${buttonText}</button>
                </div>
                <p class="encrypted-error" style="display:none;">${errorMessage}</p>
              `;
              wrapper.innerHTML = '';
              wrapper.appendChild(form);
              return form;
            }

            const salt = base64ToBytes(wrapper.dataset.salt);
            const iv = base64ToBytes(wrapper.dataset.iv);
            const payload = base64ToBytes(wrapper.dataset.payload);

            const form = renderForm();
            const input = form.querySelector('.encrypted-input');
            const buttonEl = form.querySelector('.encrypted-button');
            const errorEl = form.querySelector('.encrypted-error');

            async function decrypt(password) {
              const enc = new TextEncoder();
              const keyMaterial = await window.crypto.subtle.importKey(
                'raw',
                enc.encode(password),
                'PBKDF2',
                false,
                ['deriveKey']
              );
              const key = await window.crypto.subtle.deriveKey(
                { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['decrypt']
              );
              const decrypted = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv, tagLength: 128 },
                key,
                payload
              );
              const decoder = new TextDecoder();
              wrapper.innerHTML = decoder.decode(decrypted);
            }

            form.addEventListener('submit', async function(event) {
              event.preventDefault();
              errorEl.style.display = 'none';
              const previousText = buttonEl.textContent;
              buttonEl.disabled = true;
              buttonEl.textContent = loadingText;
              try {
                await decrypt(input.value);
              } catch (err) {
                errorEl.style.display = 'block';
                buttonEl.disabled = false;
                buttonEl.textContent = previousText;
                input.focus();
                input.select();
                return;
              }
            });

            input.focus();
          })();
        </script>
      HTML
    end
  end
end

Jekyll::Hooks.register :documents, :post_render do |doc|
  next unless doc.data["encrypt_password"] || doc.data["encrypt_password_env"]

  placeholders = Jekyll::EncryptContent.placeholders(doc)
  iterations = Jekyll::EncryptContent.iterations(doc)
  password = Jekyll::EncryptContent.password_for(doc)

  if password.nil? || password.empty?
    Jekyll.logger.warn "EncryptContent:", "#{doc.relative_path} 未设置有效密码，已跳过加密。"
    next
  end

  salt, iv, payload = Jekyll::EncryptContent.encrypt(doc.output.to_s, password, iterations)
  doc.output = Jekyll::EncryptContent.build_output(doc, salt, iv, payload, iterations, placeholders)

  unless doc.data["encrypt_excerpt"] == false
    doc.data["excerpt"] = doc.data["encrypt_excerpt"] || placeholders[:message]
  end
end
