
# react-native-noble

## Getting started

`$ npm install react-native-noble --save`

### Mostly automatic installation

`$ react-native link react-native-noble`

### Manual installation


#### iOS

1. In XCode, in the project navigator, right click `Libraries` ➜ `Add Files to [your project's name]`
2. Go to `node_modules` ➜ `react-native-noble` and add `RNNoble.xcodeproj`
3. In XCode, in the project navigator, select your project. Add `libRNNoble.a` to your project's `Build Phases` ➜ `Link Binary With Libraries`
4. Run your project (`Cmd+R`)<

#### Android

1. Open up `android/app/src/main/java/[...]/MainActivity.java`
  - Add `import com.reactlibrary.RNNoblePackage;` to the imports at the top of the file
  - Add `new RNNoblePackage()` to the list returned by the `getPackages()` method
2. Append the following lines to `android/settings.gradle`:
  	```
  	include ':react-native-noble'
  	project(':react-native-noble').projectDir = new File(rootProject.projectDir, 	'../node_modules/react-native-noble/android')
  	```
3. Insert the following lines inside the dependencies block in `android/app/build.gradle`:
  	```
      compile project(':react-native-noble')
  	```

#### Windows
[Read it! :D](https://github.com/ReactWindows/react-native)

1. In Visual Studio add the `RNNoble.sln` in `node_modules/react-native-noble/windows/RNNoble.sln` folder to their solution, reference from their app.
2. Open up your `MainPage.cs` app
  - Add `using Noble.RNNoble;` to the usings at the top of the file
  - Add `new RNNoblePackage()` to the `List<IReactPackage>` returned by the `Packages` method


## Usage
```javascript
import RNNoble from 'react-native-noble';

// TODO: What to do with the module?
RNNoble;
```
  