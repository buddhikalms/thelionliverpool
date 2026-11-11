/*
 * Validation for the site's two Web3Forms forms: contact-us/ and reservation/.
 *
 * The forms post straight to Web3Forms, so these checks run in the visitor's
 * browser only. The rules live in the HTML (required, type, pattern, min, step)
 * and still hold if this script never loads; the browser then shows its own
 * pop-ups instead of the messages below.
 *
 * With the script, a failed field looks the way MetForm showed it: red text
 * under the field (.mf-error-message, styled by the MetForm and Elementor
 * stylesheets) and aria-invalid="true" on the field. The timing follows
 * MetForm too: nothing is flagged until the first submit, the first bad field
 * then gets focus, and from then on each field updates as it is edited.
 * Spaces alone do not count as an answer.
 *
 * Once a valid form is sent, its button stays locked until the page changes,
 * so a double-click cannot send the same booking or message twice.
 *
 * nginx caches .js for a year as immutable: after changing this file, bump the
 * ?ver= on the <script> tags in contact-us/ and reservation/.
 */
(function () {
  'use strict';

  var REQUIRED = 'This field is required.';

  // A number input reads '' for text it cannot parse; badInput tells that apart from empty.
  function isBlank(field) {
    if (field.type === 'number') return field.value === '' && !field.validity.badInput;
    return field.value.trim() === '';
  }

  function errorFor(field) {
    if (isBlank(field)) return field.required ? REQUIRED : '';
    if (field.validity.valid) return '';
    return field.getAttribute('data-error') || field.validationMessage;
  }

  function show(field, message) {
    var wrapper = field.closest('.mf-input-wrapper') || field.parentNode;
    var note = wrapper.querySelector('.mf-error-message');
    if (!message) {
      if (note) note.remove();
      field.setAttribute('aria-invalid', 'false');
      field.removeAttribute('aria-describedby');
      return;
    }
    if (!note) {
      note = document.createElement('span');
      note.className = 'mf-error-message';
      note.id = field.id + '-error';
      wrapper.appendChild(note);
    }
    note.textContent = message;
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', note.id);
  }

  function setUp(form) {
    var fields = Array.prototype.slice.call(form.querySelectorAll('.mf-input'));
    var button = form.querySelector('[type="submit"]');
    var label = button.querySelector('span') || button;
    var buttonText = label.textContent;
    var submitted = false;
    var sending = false;

    function lock(on) {
      sending = on;
      button.disabled = on;
      button.style.cursor = on ? 'progress' : '';
      button.style.opacity = on ? '0.7' : '';
      label.textContent = on ? 'Sending...' : buttonText;
    }

    // This script shows the messages from here on; without it the browser checks as before.
    form.noValidate = true;

    form.addEventListener('submit', function (event) {
      if (sending) {
        event.preventDefault();
        return;
      }
      submitted = true;
      var firstBad = null;
      fields.forEach(function (field) {
        var message = errorFor(field);
        show(field, message);
        if (message && !firstBad) firstBad = field;
      });
      if (firstBad) {
        event.preventDefault();
        firstBad.scrollIntoView({ block: 'center' });
        firstBad.focus({ preventScroll: true });
        return;
      }
      fields.forEach(function (field) {
        if (field.type === 'text' || field.type === 'tel' || field.type === 'textarea') field.value = field.value.trim();
      });
      lock(true);
    });

    function recheck(event) {
      if (submitted && fields.indexOf(event.target) !== -1) show(event.target, errorFor(event.target));
    }
    form.addEventListener('input', recheck);
    form.addEventListener('change', recheck);

    // Going Back from the thank-you page can restore this page exactly as it was
    // left, button still locked. Unlock it so the form can be used again.
    window.addEventListener('pageshow', function (event) {
      if (event.persisted && sending) lock(false);
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll('form[action^="https://api.web3forms.com/"]'), setUp);
})();
