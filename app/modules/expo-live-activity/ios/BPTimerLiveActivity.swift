import ActivityKit
import WidgetKit
import SwiftUI

// Define the attributes for the Live Activity
struct BPTimerAttributes: ActivityAttributes {
    public typealias TimerStatus = ContentState
    
    public struct ContentState: Codable, Hashable {
        var timerType: String
        var expiresAt: Date
        var patientRoom: String
    }
    
    var activityName: String
}

// Live Activity Widget
@available(iOS 16.1, *)
struct BPTimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: BPTimerAttributes.self) { context in
            // Lock screen/banner UI
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(context.attributes.activityName)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Text(context.state.patientRoom)
                        .font(.headline)
                        .fontWeight(.semibold)
                    
                    Text(context.state.timerType == "bp_recheck" ? "BP Recheck Timer" : "Medication Wait")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing) {
                    Text(context.state.expiresAt, style: .timer)
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundColor(.red)
                        .monospacedDigit()
                    
                    Text("remaining")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding()
            .activityBackgroundTint(Color.white)
            .activitySystemActionForegroundColor(Color.black)
            
        } dynamicIsland: { context in
            // Dynamic Island UI
            DynamicIsland {
                // Expanded UI
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading) {
                        Text(context.state.patientRoom)
                            .font(.caption)
                            .fontWeight(.semibold)
                        Text(context.state.timerType == "bp_recheck" ? "BP Recheck" : "Med Wait")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.expiresAt, style: .timer)
                        .font(.title3)
                        .fontWeight(.bold)
                        .monospacedDigit()
                        .foregroundColor(.red)
                }
                
                DynamicIslandExpandedRegion(.center) {
                    Text("⏰")
                        .font(.largeTitle)
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Image(systemName: "clock.fill")
                            .foregroundColor(.red)
                        Text("Timer active - check BP when complete")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding(.top, 8)
                }
            } compactLeading: {
                Image(systemName: "timer")
                    .foregroundColor(.red)
            } compactTrailing: {
                Text(context.state.expiresAt, style: .timer)
                    .font(.caption2)
                    .fontWeight(.bold)
                    .monospacedDigit()
                    .foregroundColor(.red)
            } minimal: {
                Image(systemName: "timer")
                    .foregroundColor(.red)
            }
        }
    }
}
