import { MonoApi, MonoApiHelper } from 'frida-mono-api'

// MonoDelegate object layout (ARM64 LP64, stable across mono/mono and dotnet/runtime
// forks per src/mono/mono/metadata/object-internals.h):
//   +0x00  MonoObject       header (vtable, sync)        // 0x10 bytes
//   +0x10  void*            method_ptr (cached JIT entry, may be NULL pre-invoke)
//   +0x18  void*            invoke_impl
//   +0x20  MonoObject*      target (captured `this`, NULL for static)
//   +0x28  MonoMethod*      method
const DELEGATE_METHOD_PTR_OFFSET = 0x10
const DELEGATE_TARGET_OFFSET     = 0x20
const DELEGATE_METHOD_OFFSET     = 0x28

// Per-class cache of the <Callback>k__BackingField handle on
// Xamarin.Android.Net.ServerCertificateCustomValidator (or whatever class wraps the
// user-supplied Func<...>). Keyed by class-pointer string.
const _callbackFieldCache = new Map()

const MonoApiMauiHelper = {
  // Frida-17-native replacements for the broken MonoApiHelper.{ClassGetName,
  // MethodGetName, FieldGetName} that still use the removed Memory.readUtf8String.
  ClassGetName: mono_class => MonoApi.mono_class_get_name(mono_class).readUtf8String(),
  MethodGetName: mono_method => MonoApi.mono_method_get_name(mono_method).readUtf8String(),
  FieldGetName: mono_field => MonoApi.mono_field_get_name(mono_field).readUtf8String(),

  // Managed-delegate introspection. `delegateInstance` is a MonoObject* whose
  // runtime class derives from MulticastDelegate (e.g. Func<...>, Action<...>).
  DelegateGetMethod: delegateInstance => delegateInstance.add(DELEGATE_METHOD_OFFSET).readPointer(),
  DelegateGetMethodPtr: delegateInstance => delegateInstance.add(DELEGATE_METHOD_PTR_OFFSET).readPointer(),
  DelegateGetTarget: delegateInstance => delegateInstance.add(DELEGATE_TARGET_OFFSET).readPointer(),

  // Thin wrapper. Returns the JIT-compiled native entry of a MonoMethod*.
  // mono_compile_method is the canonical way to obtain the address Frida's
  // Interceptor.attach needs in order to instrument a managed method.
  CompileMethod: mono_method => MonoApi.mono_compile_method(mono_method),

  // Lazily resolves the <Callback>k__BackingField on a validator instance's runtime
  // class. Caches by class pointer so we only do the lookup once per class. Returns
  // a NativePointer (the field handle) — or NULL if the field doesn't exist on this
  // class (in which case the caller should log and fall through).
  GetCallbackField: validatorInstance => {
    const klass = MonoApiHelper.ObjectGetClass(validatorInstance)
    const key = klass.toString()
    if (_callbackFieldCache.has(key)) return _callbackFieldCache.get(key)
    const field = MonoApiHelper.ClassGetFieldFromName(klass, '<Callback>k__BackingField')
    _callbackFieldCache.set(key, field)
    return field
  }
}

export default MonoApiMauiHelper
