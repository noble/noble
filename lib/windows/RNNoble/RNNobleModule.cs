using ReactNative.Bridge;
using System;
using System.Collections.Generic;
using Windows.ApplicationModel.Core;
using Windows.UI.Core;

namespace Noble.RNNoble
{
    /// <summary>
    /// A module that allows JS to share data.
    /// </summary>
    class RNNobleModule : NativeModuleBase
    {
        /// <summary>
        /// Instantiates the <see cref="RNNobleModule"/>.
        /// </summary>
        internal RNNobleModule()
        {

        }

        /// <summary>
        /// The name of the native module.
        /// </summary>
        public override string Name
        {
            get
            {
                return "RNNoble";
            }
        }
    }
}
